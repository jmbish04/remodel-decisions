// @ts-nocheck
import { AIChatAgent } from "@cloudflare/ai-chat";
import { Env } from "../../worker-configuration";
import { openai } from "@ai-sdk/openai";
import { 
  streamText, 
  convertToModelMessages 
} from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse
} from "@cloudflare/ai-chat";
import { createResearchTools } from "../tools/research-tools";

export class ResearchAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish: (message: any) => void) {
    if (this.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = this.env.OPENAI_API_KEY;
    }

    const tools = createResearchTools(this.env);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        
        const result = streamText({
          model: openai("gpt-4o"),
          messages: await convertToModelMessages(this.messages),
          tools, 
          maxSteps: 10,
          onFinish,
          system: "You are a Research Agent. Help the user find prices and save them to the budget."
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}
