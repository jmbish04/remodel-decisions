Agent Task: Build Renovation Checklist Backend (Cloudflare Workers + Hono + D1)RoleYou are an expert Full-Stack Developer specializing in Cloudflare Workers, Hono, TypeScript, and Drizzle ORM.ObjectiveBuild a serverless backend API for a "Renovation Checklist" application. The API must use Hono with @hono/zod-openapi to automatically generate OpenAPI v3.1.0 documentation. The database is Cloudflare D1 accessed via Drizzle ORM.Tech Stack RequirementsRuntime: Cloudflare WorkersFramework: Hono (hono)Documentation: @hono/zod-openapi & @scalar/hono-api-reference (or Swagger UI)Database: Cloudflare D1ORM: Drizzle ORM (drizzle-orm, drizzle-kit)Validation: ZodDatabase Schema (Drizzle)Use the following schema structure. Ensure specific IDs (like 'kitchen_living') are supported as Primary Keys where defined.import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const areas = sqliteTable("areas", {
  id: text("id").primaryKey(), // e.g., 'floor1_general'
  title: text("title").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  areaId: text("area_id").references(() => areas.id).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const items = sqliteTable("items", {
  id: text("id").primaryKey(), // e.g., 'f1_1', or UUID for new items
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  label: text("label").notNull(),
  note: text("note"),
  isChecked: integer("is_checked", { mode: "boolean" }).default(false).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

// Define relations (Areas -> Categories -> Items)
export const areasRelations = relations(areas, ({ many }) => ({
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  area: one(areas, { fields: [categories.areaId], references: [areas.id] }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
}));
API Specification (OpenAPI v3.1.0)You must define routes using app.openapi(). Every route MUST have a distinct operationId.Endpoints RequiredGET /api/checklistOperationId: getFullChecklistDescription: Returns the full nested hierarchy (Areas -> Categories -> Items) to populate the frontend state.Response: JSON object keyed by Area ID (matching the frontend's INITIAL_DATA structure).PATCH /api/items/{id}/statusOperationId: updateItemStatusDescription: Toggles the isChecked status.Input: JSON { isChecked: boolean }PATCH /api/items/{id}/noteOperationId: updateItemNoteDescription: Updates the user note for an item.Input: JSON { note: string }POST /api/categories/{categoryId}/itemsOperationId: createItemDescription: User adds a custom item to a specific category.Input: JSON { label: string, note?: string }Logic: Generate a unique ID (e.g., using crypto.randomUUID()) and handle sort order.DELETE /api/items/{id}OperationId: deleteItemDescription: Removes an item.Documentation EndpointsGET /openapi.json: Serve the dynamic OpenAPI v3.1.0 specification.GET /swagger: Serve the API Reference UI.Implementation Scaffold (Boilerplate)Please start with this structure:import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { drizzle } from 'drizzle-orm/d1'
import { cors } from 'hono/cors'
// Import schema...

type Bindings = {
  DB: D1Database
}

const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.use('/*', cors())

// --- Routes Definition Here ---

// Example: Get Checklist
const getChecklistRoute = createRoute({
  method: 'get',
  path: '/api/checklist',
  operationId: 'getFullChecklist',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            // Define Zod schema matching the nested structure
          })
        }
      },
      description: 'Retrieve full checklist hierarchy'
    }
  }
})

app.openapi(getChecklistRoute, async (c) => {
  const db = drizzle(c.env.DB)
  // Query logic using db.query.areas.findMany({ with: { categories: { with: { items: true } } } })
  // Transform to match frontend shape if necessary
  return c.json({ /* result */ })
})

// --- Documentation ---
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Renovation Checklist API',
  },
})

app.get('/swagger', swaggerUI({ url: '/openapi.json' }))

export default app
Task ExecutionInitialize the project structure.Implement the Drizzle Schema.Implement the Zod schemas for all Inputs/Outputs.Implement all 5 API routes with database logic.Ensure operationId is present on every route.Verify that /swagger loads correctly.
