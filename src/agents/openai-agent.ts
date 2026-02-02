// @ts-nocheck
import { BaseAgent } from "./base-agent";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages
} from "ai";
import {
    createUIMessageStream,
    createUIMessageStreamResponse
} from "@cloudflare/ai-chat";

export class OpenAIAgent extends BaseAgent {
  async onChatMessage(onFinish: (message: any) => void) {
    if (this.env.OPENAI_API_KEY) {
       // @ts-ignore
       process.env.OPENAI_API_KEY = this.env.OPENAI_API_KEY;
    }

    // @ts-ignore
    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: any }) => {
        const result = streamText({
          model: openai(this.env.OPENAI_MODEL || "gpt-4o"),
          messages: await convertToModelMessages(this.messages as any), // Fixed await
          onFinish,
        });

        // @ts-ignore
        writer.merge(result.toUIMessageStream());
      }
    });

    // @ts-ignore
    return createUIMessageStreamResponse({ stream });
  }
}
