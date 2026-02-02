import { routeAgentRequest } from "agents";
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'

// Import modular routes
import checklistApp from './routes/checklist'
import itemsApp from './routes/items'
import categoriesApp from './routes/categories'

// Import Agents
import { OpenAIAgent } from "./agents/openai-agent";
import { ResearchAgent } from "./agents/research-agent";

const app = new OpenAPIHono<{ Bindings: Env }>()

app.use('/*', cors())

// Mount sub-apps
app.route('/', checklistApp)
app.route('/', itemsApp)
app.route('/', categoriesApp)

// --- Documentation ---
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Renovation Checklist API',
  },
})

app.get('/swagger', swaggerUI({ url: '/openapi.json' }))

// Export Agents for Worker Runtime
export { OpenAIAgent, ResearchAgent };

// Main Fetch Handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Try to route to an Agent first
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    // Fallback to Hono App
    return app.fetch(request, env, ctx);
  },
};
