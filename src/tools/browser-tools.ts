import type { ChatCompletionTool } from "openai/resources/chat/completions";
import * as AI from "../ai/index";
import * as BrowserService from "../services/browser-rendering";
import { Buffer } from "node:buffer";

// 1. Tool Definitions
export const BROWSER_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "scrape_page",
      description: "Scrape the content of a webpage as Markdown.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to scrape" },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "screenshot_page",
      description: "Take a screenshot of a webpage.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to screenshot" },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_structured_data",
      description: "Navigate to a URL and extract structured data based on a user prompt.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to visit" },
          prompt: { type: "string", description: "Instructions on what data to extract" },
        },
        required: ["url", "prompt"],
        additionalProperties: false,
      },
    },
  },
];

// 2. Handler Factory
export function getBrowserHandlers(env: Env) {
  return {
    scrape_page: async ({ url }: { url: string }) => {
      console.log(`[BrowserTool] Scraping (Markdown) ${url}`);
      try {
        const content = await BrowserService.renderMarkdown(env, url);
        return { content };
      } catch (error: any) {
        return { error: `Failed to scrape page: ${error.message}` };
      }
    },

    screenshot_page: async ({ url }: { url: string }) => {
      console.log(`[BrowserTool] Screenshotting ${url}`);
      try {
        const buffer = await BrowserService.renderScreenshot(env, url);
        const base64 = Buffer.from(buffer).toString("base64");
        return { format: "base64", data: base64 };
      } catch (error: any) {
        return { error: `Failed to take screenshot: ${error.message}` };
      }
    },

    extract_structured_data: async ({ url, prompt }: { url: string; prompt: string }) => {
      console.log(`[BrowserTool] Extracting Data from ${url}`);
      try {
        // 1. Get Content (Markdown is cleaner for LLM than raw HTML)
        const content = await BrowserService.renderMarkdown(env, url);
        
        // 2. AI Extraction
        const aiPrompt = `Here is the markdown content from ${url}:\n\n${content.slice(0, 15000)}\n\nUser Request: ${prompt}\n\nPlease extract the data strictly as valid JSON.`;
        
        const response = await AI.generateText(env, aiPrompt, {
          model: env.OPENAI_MODEL || "gpt-4o",
          provider: "openai"
        });

        return { extraction: response };
      } catch (error: any) {
        return { error: `Extraction failed: ${error.message}` };
      }
    },
  };
}
