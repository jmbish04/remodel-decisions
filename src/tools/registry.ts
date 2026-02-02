import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

// 1. Tool Definitions (JSON Schema for OpenAI)
export const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_server_time",
      description: "Get the current server time and timezone.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "echo_message",
      description: "Echo a message back to the user with a specific prefix.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to echo" },
          prefix: { type: "string", description: "Prefix for the message" },
        },
        required: ["message", "prefix"],
        additionalProperties: false,
      },
    },
  },
];

// 2. Tool Implementations (The actual logic)
export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  get_server_time: async () => {
    return {
      time: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
  echo_message: async ({ message, prefix }) => {
    return {
      original: message,
      result: `${prefix}: ${message}`,
    };
  },
};
