/**
 * -----------------------------------------------------------------------------
 * FILE: src/ai/types.ts
 * -----------------------------------------------------------------------------
 * DESCRIPTION:
 * Shared type definitions for AI providers and utilities.
 * -----------------------------------------------------------------------------
 */

export type AIProvider = "worker-ai" | "gemini" | "openai";

export interface AIModelOptions {
  provider?: AIProvider;
  model?: string;
  outputDimensionality?: number;
}

export interface GenerateTextOptions extends AIModelOptions {
  system?: string;
  reasoningEffort?: "low" | "medium" | "high"; // Maps to specific provider options where applicable
}

export interface GenerateStructuredOptions extends AIModelOptions {
  system?: string;
  reasoningEffort?: "low" | "medium" | "high";
}

export interface GenerateVisionOptions extends AIModelOptions {}

export type VisionInput = {
  type: "base64" | "url";
  data: string; // The Base64 string or the URL
  mimeType?: string; // e.g., 'image/jpeg', 'image/png' (Required for Base64)
};

export interface ToolResponse {
  content: string | null;
  tool_calls: {
    id: string;
    name: string;
    arguments: any;
  }[];
}

/**
 * Return type for structured generation with tools.
 * Unified across all providers to allow easy success checking.
 */
export interface StructuredToolResponse<T> {
  is_success: boolean;
  tool_calls?: any[];
  response?: T;
  content?: string;
  error?: string;
}

export interface StructuredOptions {
  /** Constrains effort on the initial reasoning pass before structuring. */
  reasoningEffort?: "low" | "medium" | "high";
  /** Optional system prompt to guide the final JSON formatting step. */
  structuringInstruction?: string;
}
