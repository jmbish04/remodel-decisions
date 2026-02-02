import { AIChatAgent } from "@cloudflare/ai-chat";

export abstract class BaseAgent extends AIChatAgent<Env> {
  // AIChatAgent handles onConnect, onMessage, and persistence automatically.
  // We only need to implement the abstract logic for generating responses.
  
  abstract onChatMessage(onFinish: (message: any) => void): Promise<any>;
}
