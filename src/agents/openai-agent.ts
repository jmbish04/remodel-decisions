import { BaseAgent } from "./base-agent";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages
} from "ai";

export class OpenAIAgent extends BaseAgent {
  async onChatMessage(onFinish: (message: any) => void) {
    const openai = createOpenAI({
        apiKey: this.env.OPENAI_API_KEY
    });

    const result = streamText({
      model: openai(this.env.OPENAI_MODEL || "gpt-4o"),
      messages: await convertToModelMessages(this.messages as any),
      onFinish,
    });

    return (result as any).toDataStreamResponse();
  }
}
