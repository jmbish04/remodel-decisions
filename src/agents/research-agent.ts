// @ts-nocheck
import { BaseAgent } from "./base-agent";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool
} from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse
} from "@cloudflare/ai-chat";
import { z } from "zod";
import { getBrowserHandlers } from "../tools/browser-tools";

export class ResearchAgent extends BaseAgent {
  async onChatMessage(onFinish: (message: any) => void) {
    if (this.env.OPENAI_API_KEY) {
       // @ts-ignore
       process.env.OPENAI_API_KEY = this.env.OPENAI_API_KEY;
    }

    const handlers = getBrowserHandlers(this.env);

    // @ts-ignore
    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: any }) => {
        
        const result = streamText({
          model: openai("gpt-4o"),
          messages: await convertToModelMessages(this.messages as any),
          // @ts-ignore
          maxSteps: 5,
          onFinish,
          system: "You are a Research Agent. Use browser tools to gather information.",
          tools: {
            scrape_page: tool({
              description: "Scrape the content of a webpage as Markdown.",
              parameters: z.object({
                url: z.string().describe("The URL to scrape"),
              }),
              execute: async ({ url }: { url: string }) => {
                 // @ts-ignore
                 const res = await handlers.scrape_page({ url });
                 return res;
              }
            }),
            screenshot_page: tool({
              description: "Take a screenshot of a webpage.",
              parameters: z.object({
                url: z.string().describe("The URL to screenshot"),
              }),
              execute: async ({ url }: { url: string }) => {
                 // @ts-ignore
                 const res = await handlers.screenshot_page({ url });
                 return res;
              }
            }),
            extract_structured_data: tool({
              description: "Navigate to a URL and extract structured data based on a user prompt.",
              parameters: z.object({
                url: z.string().describe("The URL to visit"),
                prompt: z.string().describe("Instructions on what data to extract"),
              }),
              execute: async ({ url, prompt }: { url: string; prompt: string }) => {
                 // @ts-ignore
                 const res = await handlers.extract_structured_data({ url, prompt });
                 return res;
              }
            })
          }
        });

        // @ts-ignore
        writer.merge(result.toUIMessageStream());
      }
    });

    // @ts-ignore
    return createUIMessageStreamResponse({ stream });
  }
}
