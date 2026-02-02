import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { items } from '../schema'
import * as schema from '../schema'
import { eq } from 'drizzle-orm'
import { 
  ItemSchema, 
  ErrorSchema, 
  ItemIdParam, 
  UpdateStatusSchema, 
  UpdateNoteSchema 
} from '../zod'

const app = new OpenAPIHono<{ Bindings: Env }>()

// Update Item Status
const updateItemStatusRoute = createRoute({
  method: 'patch',
  path: '/api/items/{id}/status',
  operationId: 'updateItemStatus',
  request: {
    params: ItemIdParam,
    body: {
      content: {
        'application/json': {
          schema: UpdateStatusSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ItemSchema } },
      description: 'Item status updated'
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Item not found'
    }
  }
})

app.openapi(updateItemStatusRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { isChecked } = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const result = await db.update(items)
    .set({ isChecked })
    .where(eq(items.id, id))
    .returning()
    .get()

  if (!result) return c.json({ message: 'Item not found' }, 404)
  return c.json(result)
})

// Update Item Note
const updateItemNoteRoute = createRoute({
  method: 'patch',
  path: '/api/items/{id}/note',
  operationId: 'updateItemNote',
  request: {
    params: ItemIdParam,
    body: {
      content: {
        'application/json': {
          schema: UpdateNoteSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ItemSchema } },
      description: 'Item note updated'
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Item not found'
    }
  }
})

app.openapi(updateItemNoteRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { note } = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const result = await db.update(items)
    .set({ note })
    .where(eq(items.id, id))
    .returning()
    .get()

  if (!result) return c.json({ message: 'Item not found' }, 404)
  return c.json(result)
})

// Delete Item
const deleteItemRoute = createRoute({
  method: 'delete',
  path: '/api/items/{id}',
  operationId: 'deleteItem',
  request: {
    params: ItemIdParam
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ItemSchema.pick({ id: true }) } },
      description: 'Item deleted'
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Item not found'
    }
  }
})

app.openapi(deleteItemRoute, async (c) => {
  const { id } = c.req.valid('param')
  const db = drizzle(c.env.DB, { schema })

  const result = await db.delete(items)
    .where(eq(items.id, id))
    .returning({ id: items.id })
    .get()
  
  if (!result) return c.json({ message: 'Item not found' }, 404)
  return c.json(result)
})

export default app
