import { AIChatAgent } from "@cloudflare/ai-chat";
import { createOpenAI } from "@ai-sdk/openai";
import { 
  streamText, 
  convertToModelMessages
} from "ai";
import { createResearchTools } from "../tools/research-tools";

export class ResearchAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish: (message: any) => void) {
    const openai = createOpenAI({
        apiKey: this.env.OPENAI_API_KEY
    });
    
    const tools = createResearchTools(this.env);

    const result = streamText({
      model: openai("gpt-4o"),
      messages: await convertToModelMessages(this.messages as any),
      tools, 
      maxSteps: 10,
      onFinish,
      system: "You are a Research Agent. Help the user find prices and save them to the budget."
    } as any);

    return (result as any).toDataStreamResponse();
  }
}
