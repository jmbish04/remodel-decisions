// Centralized AI Services Export

import { z } from "@hono/zod-openapi";
import * as Gemini from "./providers/gemini";
import * as OpenAI from "./providers/openai";
import * as WorkerAI from "./providers/worker-ai";

import type { VisionInput, StructuredToolResponse } from "./types";
import type {
  AIModelOptions,
  GenerateTextOptions,
  GenerateStructuredOptions,
  GenerateVisionOptions
} from "./types";

// Providers
export { Gemini, OpenAI, WorkerAI };

// Utilities
export * from "./utils/index";

// --- UNIFIED INTERFACES ---
export * from "./types";

// --- UNIFIED FUNCTIONS ---

/**
 * Generates text using the specified provider (defaults to Worker AI).
 */
export async function generateText(
  env: Env,
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const provider = options.provider || "worker-ai";
  const system = options.system;
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateText(env, prompt, system, model);
    case "openai":
      return OpenAI.generateText(env, prompt, system, model);
    case "worker-ai":
    default:
      // Worker AI signature: (env, input, systemInstruction, model, options)
      return WorkerAI.generateText(env, prompt, system, model, {
        effort: options.reasoningEffort
      });
  }
}

/**
 * Generates structured data using the specified provider (defaults to Worker AI).
 */
export async function generateStructured<T = any>(
  env: Env,
  prompt: string,
  schema: z.ZodType<T> | object,
  options: GenerateStructuredOptions = {}
): Promise<T> {
  const provider = options.provider || "worker-ai";
  const system = options.system;
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateStructured(env, prompt, schema, system, {
        modelName: model
      });

    case "openai":
      return OpenAI.generateStructured(env, prompt, schema, system, {
        modelName: model
      });

    case "worker-ai":
    default:
      return WorkerAI.generateStructured(env, prompt, schema, system, {
        reasoningEffort: options.reasoningEffort,
        modelName: model
      });
  }
}

/**
 * Generates embeddings using the specified provider (defaults to Worker AI).
 */
export async function generateEmbeddings(
  env: Env,
  text: string,
  options: AIModelOptions = {}
): Promise<number[]> {
  const provider = options.provider || "worker-ai";
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateEmbeddings(env, text, {
        model: model,
        outputDimensionality: options.outputDimensionality
      });
    case "openai":
      return OpenAI.generateEmbeddings(env, text, { model });
    case "worker-ai":
    default:
      return WorkerAI.generateEmbeddings(env, text, { model });
  }
}

/**
 * Generates text from vision input using the specified provider (defaults to Worker AI).
 */
export async function generateVision(
  env: Env,
  image: VisionInput,
  prompt: string,
  options: GenerateVisionOptions = {}
): Promise<string> {
  const provider = options.provider || "worker-ai";
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateVision(env, image, prompt, { modelName: model });
    case "openai":
      return OpenAI.generateVision(env, image, prompt, { modelName: model });
    case "worker-ai":
    default:
      return WorkerAI.generateVision(env, image, prompt, { modelName: model });
  }
}

/**
 * Generates structured response from vision input using the specified provider (defaults to Worker AI).
 */
export async function generateVisionStructured<T>(
  env: Env,
  image: VisionInput,
  prompt: string,
  schema: z.ZodType<T>,
  options: GenerateVisionOptions = {}
): Promise<T> {
  const provider = options.provider || "worker-ai";
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateVisionStructured(env, image, prompt, schema, {
        modelName: model
      });
    case "openai":
      return OpenAI.generateVisionStructured(env, image, prompt, schema, {
        modelName: model
      });
    case "worker-ai":
    default:
      return WorkerAI.generateVisionStructured(env, image, prompt, schema, {
        modelName: model
      });
  }
}

/**
 * Generates text with tool support using the specified provider.
 */
export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  options: AIModelOptions = {}
): Promise<{ content: string | null; tool_calls: any[] }> {
  const provider = options.provider || "worker-ai";
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateWithTools(env, messages, tools, model);
    case "openai":
      return OpenAI.generateWithTools(env, messages, tools, model);
    case "worker-ai":
    default:
      return WorkerAI.generateWithTools(env, messages, tools, model);
  }
}

/**
 * Generates structured output with tool support (final_response pattern) using the specified provider.
 * Returns a Unified StructuredToolResponse with is_success flag.
 */
export async function generateStructuredWithTools<T>(
  env: Env,
  messages: any[],
  tools: any[],
  schema: z.ZodType<T>,
  options: AIModelOptions = {}
): Promise<StructuredToolResponse<T>> {
  const provider = options.provider || "worker-ai";
  const model = options.model;

  switch (provider) {
    case "gemini":
      return Gemini.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        model
      );
    case "openai":
      return OpenAI.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        model
      );
    case "worker-ai":
    default:
      return WorkerAI.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        model
      );
  }
}
