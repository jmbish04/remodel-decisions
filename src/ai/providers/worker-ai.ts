/**
 * -----------------------------------------------------------------------------
 * FILE: src/ai/providers/worker-ai.ts
 * -----------------------------------------------------------------------------
 * DESCRIPTION:
 * Centralized utility module for Cloudflare Workers AI.
 * Handles Text, Structured, Vision, Embeddings, Tool Formatting, and Reranking.
 * -----------------------------------------------------------------------------
 */

import { z } from "@hono/zod-openapi";
import { zodToJsonSchema } from "zod-to-json-schema";
import { cleanJsonOutput, sanitizeAndFormatResponse } from "../utils/sanitizer";
import { recommendModel } from "../utils/worker-ai-advisor";
import type {
  VisionInput,
  StructuredToolResponse,
  StructuredOptions
} from "../types";

// --- Model Configuration ---

const REASONING_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const STRUCTURING_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const DEFAULT_EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";

export const WorkerAIModels = {
  TEXT_REASONING: REASONING_MODEL,
  TEXT_FAST: "@cf/meta/llama-3-8b-instruct",
  STRUCTURED: STRUCTURING_MODEL,
  VISION: VISION_MODEL,
  EMBEDDING: DEFAULT_EMBEDDING_MODEL
};

// --- TYPES ---

export interface ReasoningOptions {
  effort?: "low" | "medium" | "high";
  summary?: "concise" | "detailed" | "auto";
  sanitize?: boolean;
}

// --- SCHEMA HELPERS ---

/**
 * Clean schema parameters for Worker AI / Llama.
 * Llama often struggles with "~standard" keys or "additionalProperties".
 */
function cleanWorkerAISchema(schema: any): any {
  const clean = (obj: any) => {
    if (typeof obj !== "object" || obj === null) return;

    delete obj["~standard"];
    delete obj["$schema"];
    delete obj["additionalProperties"]; // Worker AI usually handles loose schemas better without this
    delete obj["def"]; // Causing 400s in some Zod->JSON Schema outputs

    if (obj.properties) {
      for (const key in obj.properties) {
        clean(obj.properties[key]);
      }
    }
    if (obj.items) {
      clean(obj.items);
    }
  };

  const copy = JSON.parse(JSON.stringify(schema));
  clean(copy);
  return copy;
}

// --- TOOL HELPERS ---

export function toWorkerAITool(
  name: string,
  description: string,
  schema: z.ZodType<any>
): any {
  const jsonSchema = zodToJsonSchema(schema as any) as any;
  const cleanedSchema = cleanWorkerAISchema(jsonSchema);

  return {
    type: "function",
    function: {
      name,
      description,
      parameters: cleanedSchema
    }
  };
}

// --- CORE FUNCTIONS ---

export async function generateText(
  env: Env,
  input: string,
  systemInstruction?: string,
  model?: string, // Compatibility signature
  options?: ReasoningOptions
): Promise<string> {
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: input });

  const payload: any = { messages };
  // Use provided model or default reasoning model
  const modelToUse = model || REASONING_MODEL;

  try {
    const response = await env.AI.run(modelToUse as any, payload);

    let textResult = "";
    if (
      typeof response === "object" &&
      response !== null &&
      "response" in response
    ) {
      const raw = (response as any).response;
      textResult = typeof raw === "string" ? raw : JSON.stringify(raw);
    } else {
      textResult = String(response);
    }

    if (options?.sanitize) {
      return sanitizeAndFormatResponse(textResult);
    }
    return textResult;
  } catch (error) {
    console.error("Worker AI Generation Error:", error);
    throw new Error(
      `Failed to generate text: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateStructured<T = any>(
  env: Env,
  prompt: string,
  schema: z.ZodType<T> | object,
  systemPrompt?: string,
  options?: StructuredOptions & { modelName?: string }
): Promise<T> {
  try {
    let jsonSchema: object;
    if (
      typeof schema === "object" &&
      schema !== null &&
      ("_def" in schema || "parse" in schema)
    ) {
      jsonSchema = zodToJsonSchema(schema as any);
    } else {
      jsonSchema = schema as object;
    }

    const cleanedSchema = cleanWorkerAISchema(jsonSchema);

    // Step 1: Reasoning Phase (optional but recommended for complex structures)
    const reasoningOutput = await generateText(
      env,
      prompt,
      "Analyze the following input comprehensively. Provide a detailed analysis that covers all aspects required.",
      options?.modelName || REASONING_MODEL,
      { effort: options?.reasoningEffort || "high", sanitize: false }
    );

    if (!reasoningOutput || reasoningOutput.trim().length === 0) {
      throw new Error("Reasoning model returned no content.");
    }

    // Step 2: Structuring Phase
    const structuringPrompt =
      systemPrompt ||
      options?.structuringInstruction ||
      "Extract information from the analysis and format it strictly according to the JSON schema.";

    const messages = [
      { role: "system", content: structuringPrompt },
      { role: "user", content: `Analysis Content:\n${reasoningOutput}` }
    ];

    const response = await env.AI.run(STRUCTURING_MODEL as any, {
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          schema: cleanedSchema,
          strict: true
        }
      }
    });

    if (
      typeof response === "object" &&
      response !== null &&
      "response" in response
    ) {
      const rawJson = (response as any).response;
      return typeof rawJson === "object"
        ? rawJson
        : JSON.parse(cleanJsonOutput(String(rawJson)));
    }

    throw new Error("Unexpected response format from structuring model");
  } catch (error) {
    console.error("Worker AI Structured Chain Error:", error);
    throw error;
  }
}

export async function generateVision(
  env: Env,
  image: VisionInput,
  prompt: string,
  options?: { modelName?: string }
): Promise<string> {
  let imageInput: number[] = [];

  if (image.type === "base64") {
    const binaryString = atob(image.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    imageInput = Array.from(bytes);
  } else {
    throw new Error("Worker AI currently requires Base64 image input.");
  }

  try {
    const model = options?.modelName || VISION_MODEL;
    const response = await env.AI.run(model as any, {
      prompt: prompt,
      image: imageInput
    });
    return (response as any).response || JSON.stringify(response);
  } catch (error) {
    console.error("Worker AI Vision Error:", error);
    throw error;
  }
}

export async function generateVisionStructured<T>(
  env: Env,
  image: VisionInput,
  prompt: string,
  schema: z.ZodType<T>,
  options?: StructuredOptions & { modelName?: string }
): Promise<T> {
  const validationPrompt = `${prompt} 
    Describe the image in extreme detail, focusing specifically on the data points required to answer the prompt. 
    Do not output JSON yet, just describe the visual facts.`;

  const rawDescription = await generateVision(
    env,
    image,
    validationPrompt,
    options
  );

  const resultObject = await generateStructured(
    env,
    `Extract data from this visual description:\n\n${rawDescription}`,
    schema,
    options?.structuringInstruction,
    { modelName: options?.modelName }
  );

  return resultObject;
}

export async function generateEmbeddings(
  env: Env,
  text: string,
  options: { model?: string } = {}
): Promise<number[]> {
  const model = options.model || DEFAULT_EMBEDDING_MODEL;
  try {
    const response = await env.AI.run(model as any, { text: [text] });
    return (response as any).data[0];
  } catch (error) {
    console.error(`Worker AI Embedding Error (${model}):`, error);
    throw error;
  }
}

export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  model: string = WorkerAIModels.TEXT_FAST
): Promise<{ content: string | null; tool_calls: any[] }> {
  const cleanedTools = tools.map((t) => {
    if (t.function && t.function.parameters) {
      t.function.parameters = cleanWorkerAISchema(t.function.parameters);
    }
    return t;
  });

  try {
    const response = await env.AI.run(
      model as any,
      {
        messages,
        tools: cleanedTools
      } as any
    );

    const result = response as any;

    // Normalize Worker AI response
    // Sometimes it returns just the string, sometimes object with tool_calls
    return {
      content: typeof result === "string" ? result : result.response || null,
      tool_calls: result.tool_calls || []
    };
  } catch (error) {
    console.error("Worker AI Tool Generation Error:", error);
    throw error;
  }
}

export async function generateStructuredWithTools<T>(
  env: Env,
  messages: any[],
  tools: any[],
  schema: z.ZodType<T>,
  model: string = WorkerAIModels.TEXT_FAST
): Promise<StructuredToolResponse<T>> {
  try {
    const finalTool = toWorkerAITool(
      "final_response",
      "Call this tool to provide the final structured response.",
      schema
    );

    const allTools = [...tools, finalTool].map((t) => {
      if (t.function && t.function.parameters) {
        t.function.parameters = cleanWorkerAISchema(t.function.parameters);
      }
      return t;
    });

    const sanitizedMessages = messages.map((m: any) => {
      const msg: any = {
        role: m.role,
        content:
          m.content === null || m.content === undefined ? "" : String(m.content)
      };
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.name) msg.name = m.name;
      return msg;
    });

    const response = await env.AI.run(
      model as any,
      {
        messages: sanitizedMessages,
        tools: allTools
      } as any
    );

    const result: any = response;
    const toolCalls: any[] = [];
    let finalResponse: T | undefined;

    if (result.tool_calls) {
      for (const tc of result.tool_calls) {
        if (tc.name === "final_response") {
          finalResponse = tc.arguments as T;
        } else {
          toolCalls.push(tc);
        }
      }
    }

    const isSuccess = finalResponse !== undefined;

    return {
      is_success: isSuccess,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      response: finalResponse,
      content: result.response ? String(result.response) : undefined,
      error: isSuccess ? undefined : "Model did not call final_response tool"
    };
  } catch (error: any) {
    console.error("Worker AI Structured Tool Generation Error:", error);
    return {
      is_success: false,
      error: error.message || String(error)
    };
  }
}

export { recommendModel };
export const queryWorkerAI = generateText;
export const queryWorkerAIStructured = async (
  env: Env,
  prompt: string,
  schema: object,
  systemPrompt?: string
) => {
  return generateStructured(env, prompt, schema, systemPrompt);
};
export const queryWorkerAIVision = generateVision;
