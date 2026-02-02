/**
 * -----------------------------------------------------------------------------
 * FILE: src/ai/providers/openai.ts
 * -----------------------------------------------------------------------------
 * DESCRIPTION:
 * OpenAI Provider Logic.
 * Includes: Text generation, Structured outputs, Vision, and Embeddings.
 * -----------------------------------------------------------------------------
 */

import { z } from "@hono/zod-openapi";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getAIGatewayUrl } from "../utils/ai-gateway";
import type {
  VisionInput,
  StructuredToolResponse,
  StructuredOptions
} from "../types";

export const DEFAULT_OPENAI_MODEL = "gpt-4o";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// --- SCHEMA HELPERS ---

function cleanOpenAISchema(schema: any): any {
  const clean = (obj: any) => {
    if (typeof obj !== "object" || obj === null) return;

    delete obj["~standard"];
    delete obj["$schema"];
    delete obj["def"];

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

export function toOpenAITool(
  name: string,
  description: string,
  schema: z.ZodType<any>
): any {
  // Check if schema is None/Null/Undefined
  if (!schema || (schema as any)._def?.typeName === "ZodNull") {
      return {
          type: "function",
          function: {
              name,
              description,
              parameters: { type: "object", properties: {} } // OpenAI requires this for no-arg functions
          }
      };
  }

  const jsonSchema = zodToJsonSchema(schema as any, { target: "openApi3" });
  const cleanedSchema = cleanOpenAISchema(jsonSchema);

  // OpenAI requires parameters to be an object
  if (cleanedSchema.type !== "object") {
       // If usage is technically optional (z.string().optional()), it can fail here if not wrapped in z.object
       // But tools.ts wraps everything in z.object.
       // The error 'type: "None"' suggests jsonSchema itself is somehow messed up or the input schema is weird.
       // Let's force it to be an object if it says "None" or isn't object.
       if (cleanedSchema.type === "None" || !cleanedSchema.type) {
           cleanedSchema.type = "object";
           if (!cleanedSchema.properties) cleanedSchema.properties = {};
       }
  }

  return {
    type: "function",
    function: {
      name,
      description,
      parameters: cleanedSchema
    }
  };
}

// --- CLIENT FACTORY ---

export async function createOpenAIClient(env: Env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  // Dynamic import to avoid top-level Wasm loads (tiktoken)
  const { OpenAI } = await import("openai");

  return new OpenAI({
    apiKey: apiKey,
    baseURL: getAIGatewayUrl(env, { provider: "openai" }),
    defaultHeaders: {
      "cf-aig-authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`
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
  const client = await createOpenAIClient(env);
  model = model || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  try {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const completion = await client.chat.completions.create({
      model,
      messages
    });
    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI Query Error:", error);
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
  const client = await createOpenAIClient(env);
  const model = options?.modelName || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  let jsonSchema: any;
  if (
    typeof schema === "object" &&
    schema !== null &&
    ("_def" in schema || "parse" in schema)
  ) {
    jsonSchema = zodToJsonSchema(schema as any, { target: "openApi3" });
  } else {
    jsonSchema = schema;
  }

  const cleanedSchema = cleanOpenAISchema(jsonSchema);

  try {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const completion = await client.chat.completions.create({
      model,
      messages: messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: cleanedSchema,
          strict: true
        }
      }
    });
    const content = completion.choices[0].message.content || "{}";
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Structured Error:", error);
    throw error;
  }
}

export async function generateVision(
  env: Env,
  image: VisionInput,
  prompt: string,
  options?: { modelName?: string }
): Promise<string> {
  const client = await createOpenAIClient(env);
  const modelName =
    options?.modelName || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  try {
    let imageUrlContent: string;
    if (image.type === "url") {
      imageUrlContent = image.data;
    } else {
      imageUrlContent = image.data.startsWith("data:")
        ? image.data
        : `data:${image.mimeType || "image/jpeg"};base64,${image.data}`;
    }

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrlContent } }
          ]
        }
      ]
    });
    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI Vision Error:", error);
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

  const rawDescription = await generateVision(env, image, validationPrompt, {
    modelName: options?.modelName
  });

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
  const client = await createOpenAIClient(env);
  const model = options.model || DEFAULT_EMBEDDING_MODEL;

  try {
    const response = await client.embeddings.create({
      model,
      input: text,
      encoding_format: "float"
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("OpenAI API returned no embedding data.");
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI Embedding Error:", error);
    throw error;
  }
}

// --- UPDATED generateWithTools TO FIX TYPE ERROR ---

export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  model?: string
): Promise<{ content: string | null; tool_calls: any[] }> {
  const client = await createOpenAIClient(env);

  const cleanedTools = tools.map((t) => {
    if (t.function && t.function.parameters) {
      t.function.parameters = cleanOpenAISchema(t.function.parameters);
    }
    return t;
  });

  try {
    const completion = await client.chat.completions.create({
      model: model || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages,
      tools: cleanedTools
    });

    const msg = completion.choices[0].message;

    // TYPE GUARD FIX: Check for 'function' type explicitly
    const toolCalls = msg.tool_calls
      ? msg.tool_calls
          .filter((tc) => tc.type === "function")
          .map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
          }))
      : [];

    return {
      content: msg.content,
      tool_calls: toolCalls
    };
  } catch (error) {
    console.error("OpenAI Tool Gen Error:", error);
    throw error;
  }
}

export async function generateStructuredWithTools<T>(
  env: Env,
  messages: any[],
  tools: any[],
  schema: z.ZodType<T>,
  model?: string
): Promise<StructuredToolResponse<T>> {
  const finalTool = toOpenAITool(
    "final_response",
    "Call this tool to provide the final structured response.",
    schema
  );

  const allTools = [...tools, finalTool].map((t) => {
    if (t.function && t.function.parameters) {
      t.function.parameters = cleanOpenAISchema(t.function.parameters);
    }
    return t;
  });

  const client = await createOpenAIClient(env);

  try {
    const completion = await client.chat.completions.create({
      model: model || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages,
      tools: allTools,
      tool_choice: "auto"
    });

    const choice = completion.choices[0];
    const message = choice.message;

    const toolCalls: any[] = [];
    let finalResponse: T | undefined;

    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.type !== "function") continue; // Skip non-function tools

        if (tc.function.name === "final_response") {
          try {
            finalResponse = JSON.parse(tc.function.arguments);
          } catch (e) {
            console.error("Failed to parse final_response args", e);
          }
        } else {
          toolCalls.push({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
            id: tc.id
          });
        }
      }
    }

    const isSuccess = finalResponse !== undefined;

    return {
      is_success: isSuccess,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      response: finalResponse,
      content: message.content || undefined,
      error: isSuccess ? undefined : "Model did not call final_response tool"
    };
  } catch (error: any) {
    console.error("OpenAI Structured Tool Gen Error:", error);
    return {
      is_success: false,
      error: error.message || String(error)
    };
  }
}
