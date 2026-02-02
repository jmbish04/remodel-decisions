import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { items, categories } from '../db/schema'
import * as schema from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { 
  ItemSchema, 
  ErrorSchema, 
  CategoryIdParam, 
  CreateItemSchema 
} from '../zod'

const app = new OpenAPIHono<{ Bindings: Env }>()

// Create Item in Category
const createItemRoute = createRoute({
  method: 'post',
  path: '/api/categories/{categoryId}/items',
  operationId: 'createItem',
  request: {
    params: CategoryIdParam,
    body: {
      content: {
        'application/json': {
          schema: CreateItemSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: { 'application/json': { schema: ItemSchema } },
      description: 'Item created'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid input'
    }
  }
})

import type { Context } from 'hono';

app.openapi(createItemRoute, async (c) => {
  const { categoryId } = c.req.valid('param')
  const { label, note } = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  if (isNaN(categoryId)) {
    return c.json({ message: 'Invalid category ID' }, 400)
  }

  // Find max sort order
  const resultMax = await db.select({ sortOrder: items.sortOrder })
    .from(items)
    .where(eq(items.categoryId, categoryId))
    .orderBy(desc(items.sortOrder))
    .limit(1)
    .get()
  
  const sortOrder = resultMax ? resultMax.sortOrder + 1 : 0
  const id = crypto.randomUUID()

  const result = await db.insert(items).values({
    id,
    categoryId,
    label,
    note: note || null,
    isChecked: false,
    sortOrder
  }).returning().get()

  return c.json(result, 201)
})

export default app
