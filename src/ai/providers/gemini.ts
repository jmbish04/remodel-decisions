import { z } from "@hono/zod-openapi";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getAIGatewayUrl } from "../utils/ai-gateway";
import type {
  VisionInput,
  StructuredToolResponse,
  StructuredOptions
} from "../types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";

// --- HISTORY & TOOL HELPERS ---

export function toGeminiHistory(
  history: {
    role: string;
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
  }[]
): any[] {
  return history.map((msg) => {
    switch (msg.role) {
      case "user":
        return { role: "user", parts: [{ text: msg.content || "" }] };
      case "assistant":
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          // Map assistant tool calls to model parts
          const parts = msg.tool_calls.map((tc: any) => ({
            functionCall: {
              name: tc.name,
              args: tc.arguments
            }
          }));
          return { role: "model", parts };
        }
        return { role: "model", parts: [{ text: msg.content || "" }] };
      case "system":
        return {
          role: "user", // System prompts are often passed as user msg in chat history or config
          parts: [{ text: `System Context: ${msg.content}` }]
        };
      case "tool":
        // Map 'tool' output to 'function' role for Gemini
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name || "unknown_tool",
                response: {
                  name: msg.name || "unknown_tool",
                  content: safeJsonParse(msg.content)
                }
              }
            }
          ]
        };
      default:
        return { role: "user", parts: [{ text: msg.content || "" }] };
    }
  });
}

function safeJsonParse(str: string | null) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return { result: str };
  }
}

/**
 * Normalizes tool definitions for Gemini API compatibility
 * Handles multiple tool format styles and converts Zod schemas to JSON schemas
 * @param tool - Tool definition in various formats (OpenAI-style, direct, or with Zod schemas)
 * @returns Normalized tool definition compatible with Gemini API
 */
function normalizeTool(tool: any): any {
  let normalized = tool;

  // Handle OpenAI-style tool format with nested function definition
  if (tool.type === "function" && tool.function) {
    normalized = tool.function;
  } else if (tool.type && !tool.function) {
    // Handle tool with type field but no function nesting
    const { type, execute, ...rest } = tool;
    normalized = rest;
  } else {
    // Remove non-serializable execute function if present
    const { execute, ...rest } = tool;
    normalized = rest;
  }

  // Convert Zod schemas to JSON schemas for Gemini API compatibility
  // Zod schemas are detected by the presence of _def or parse properties
  if (normalized.parameters && typeof normalized.parameters === 'object' && ('_def' in normalized.parameters || 'parse' in normalized.parameters)) {
    const jsonSchema = zodToJsonSchema(normalized.parameters as any, { target: "openApi3" }) as any;
    normalized.parameters = {
      type: "OBJECT",
      properties: jsonSchema.properties || {},
      required: jsonSchema.required || []
    };
  }

  return cleanGeminiParameters(normalized);
}

function cleanGeminiParameters(toolDef: any) {
  if (toolDef.parameters) {
    const clean = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return;
      delete obj["~standard"];
      delete obj["$schema"];
      delete obj["additionalProperties"];
      delete obj["def"];
      if (obj.properties) {
        for (const key in obj.properties) {
          clean(obj.properties[key]);
        }
      }
      if (obj.items) clean(obj.items);
    };
    clean(toolDef.parameters);
  }
  return toolDef;
}

export function toGeminiTool(
  name: string,
  description: string,
  schema: z.ZodType<any>
): any {
  const jsonSchema = zodToJsonSchema(schema as any, {
    target: "openApi3"
  }) as any;
  if (jsonSchema.$schema) delete jsonSchema.$schema;
  if (jsonSchema.additionalProperties) delete jsonSchema.additionalProperties;
  const tool = {
    name,
    description,
    parameters: {
      type: "OBJECT",
      properties: jsonSchema.properties,
      required: jsonSchema.required
    }
  };
  return cleanGeminiParameters(tool);
}

// --- CLIENT ---
export async function createGeminiClient(env: Env) {
  const geminiApiKey = env.GEMINI_API_KEY;
  if (!geminiApiKey || !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Missing GEMINI_API_KEY or CLOUDFLARE_ACCOUNT_ID");
  }
  // Dynamic import to prevent potential Wasm loading issues
  const { GoogleGenAI } = await import("@google/genai");

  return new GoogleGenAI({
    apiKey: geminiApiKey,
    apiVersion: "v1beta",
    httpOptions: {
      baseUrl: getAIGatewayUrl(env, { provider: "google-ai-studio" }),
      headers: {
        "cf-aig-authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`
      }
    }
  });
}

// --- QUERY METHODS ---

export async function generateText(
  env: Env,
  prompt: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const client = await createGeminiClient(env);
  const m = model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  try {
    const result = await client.models.generateContent({
      model: m,
      config: { systemInstruction: systemPrompt },
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Query Error:", error);
    throw error;
  }
}

export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  model?: string
): Promise<{ content: string | null; tool_calls: any[] }> {
  const client = await createGeminiClient(env);
  const geminiHistory = toGeminiHistory(messages);
  const lastMessage = geminiHistory.pop();
  const normalizedTools = tools.map(normalizeTool);

  try {
    // Call SDK
    const result = await client.models.generateContent({
      model: model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: [...geminiHistory, lastMessage],
      config: {
        tools: [{ functionDeclarations: normalizedTools }] as any
      }
    });

    // NORMALIZATION FIX:
    // The SDK returns the response object directly as 'result'
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let content = "";
    const tool_calls: any[] = [];

    for (const part of parts) {
      if (part.text) content += part.text;
      if (part.functionCall) {
        tool_calls.push({
          id: "call_" + crypto.randomUUID(), // Gemini doesn't have Call IDs, generate one
          name: part.functionCall.name,
          arguments: part.functionCall.args
        });
      }
    }

    return {
      content: content || null,
      tool_calls: tool_calls
    };
  } catch (error) {
    console.error("Gemini Tool Gen Error:", error);
    throw error;
  }
}

export async function generateStructured<T = any>(
  env: Env,
  prompt: string,
  schema: z.ZodType<T> | object,
  systemPrompt?: string,
  options?: { modelName?: string }
): Promise<T> {
  const client = await createGeminiClient(env);
  let jsonSchema: any;
  if (
    typeof schema === "object" &&
    schema !== null &&
    ("_def" in schema || "parse" in schema)
  ) {
    jsonSchema = zodToJsonSchema(schema as any, { target: "openApi3" });
    delete jsonSchema?.$schema;
    delete jsonSchema?.additionalProperties;
  } else {
    jsonSchema = schema;
  }

  try {
    const result = await client.models.generateContent({
      model: options?.modelName || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: jsonSchema
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = result.text;
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Structured Query Error:", error);
    throw error;
  }
}

// ... generateVision ... (Same structure: use 'result.text')
export async function generateVision(
  env: Env,
  image: VisionInput,
  prompt: string,
  options?: { modelName?: string }
): Promise<string> {
  const client = await createGeminiClient(env);
  try {
    let imagePart;
    if (image.type === "base64") {
      imagePart = {
        inlineData: {
          mimeType: image.mimeType || "image/jpeg",
          data: image.data
        }
      };
    } else {
      throw new Error("Gemini via this SDK helper currently requires Base64.");
    }

    const result = await client.models.generateContent({
      model: options?.modelName || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }]
    });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
}

// ... generateVisionStructured ... (Calls generateVision -> generateStructured, logic remains valid)
export async function generateVisionStructured<T>(
  env: Env,
  image: VisionInput,
  prompt: string,
  schema: z.ZodType<T>,
  options?: StructuredOptions & { modelName?: string }
): Promise<T> {
  const validationPrompt = `${prompt}. Describe the image in extreme detail focused on data extraction. Do not output JSON.`;
  const rawDescription = await generateVision(
    env,
    image,
    validationPrompt,
    options
  );
  return await generateStructured(
    env,
    `Extract data from this description:\n\n${rawDescription}`,
    schema,
    options?.structuringInstruction,
    { modelName: options?.modelName }
  );
}

// ... generateEmbeddings ... (Uses embedContent, result.embeddings)
export async function generateEmbeddings(
  env: Env,
  text: string,
  options: { model?: string; outputDimensionality?: number } = {}
): Promise<number[]> {
  const client = await createGeminiClient(env);
  try {
    const result = await client.models.embedContent({
      model: options.model || DEFAULT_EMBEDDING_MODEL,
      config: options.outputDimensionality
        ? { outputDimensionality: options.outputDimensionality }
        : undefined,
      contents: [{ parts: [{ text: text }] }]
    });
    if (!result.embeddings?.length || !result.embeddings[0].values)
      throw new Error("No embeddings returned");
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    throw error;
  }
}

// ... generateStructuredWithTools ... (Legacy support, keep if needed or remove if using generateWithTools + JSON mode)
export async function generateStructuredWithTools<T>(
  env: Env,
  messages: any[],
  tools: any[],
  schema: z.ZodType<T>,
  model?: string
): Promise<StructuredToolResponse<T>> {
  const finalTool = toGeminiTool(
    "final_response",
    "Provide final structured response.",
    schema
  );
  const allTools = [...tools, finalTool].map(normalizeTool);
  const client = await createGeminiClient(env);
  const contents = toGeminiHistory(messages);

  try {
    const result = await client.models.generateContent({
      model: model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: contents,
      config: { tools: [{ functionDeclarations: allTools }] as any }
    });

    const candidate = result.candidates?.[0];
    if (!candidate) return { is_success: false, error: "Empty response" };

    const parts = candidate.content?.parts || [];
    const toolCalls: any[] = [];
    let content = "";
    let finalResponse: T | undefined;

    for (const part of parts) {
      if (part.text) content += part.text;
      if (part.functionCall) {
        if (part.functionCall.name === "final_response") {
          finalResponse = part.functionCall.args as T;
        } else {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args,
            id: "call_" + crypto.randomUUID()
          });
        }
      }
    }

    return {
      is_success: finalResponse !== undefined,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      response: finalResponse,
      content: content || undefined,
      error:
        finalResponse === undefined
          ? "Model did not call final_response"
          : undefined
    };
  } catch (error: any) {
    console.error("Gemini Structured Tool Gen Error:", error);
    return { is_success: false, error: error.message };
  }
}
