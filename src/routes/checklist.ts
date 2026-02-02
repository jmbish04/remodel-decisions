import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { ChecklistResponseSchema } from '../zod'

const app = new OpenAPIHono<{ Bindings: Env }>()

const getChecklistRoute = createRoute({
  method: 'get',
  path: '/api/checklist',
  operationId: 'getFullChecklist',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ChecklistResponseSchema
        }
      },
      description: 'Retrieve full checklist hierarchy'
    }
  }
})

import type { Context } from 'hono';

app.openapi(getChecklistRoute, async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const allAreas = await db.query.areas.findMany({
    with: {
      categories: {
        orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
        with: {
          items: {
            orderBy: (items, { asc }) => [asc(items.sortOrder)]
          }
        }
      }
    },
    orderBy: (areas, { asc }) => [asc(areas.sortOrder)]
  })

  // Transform Array to Record<AreaId, Area>
  const response: Record<string, any> = {}
  for (const area of allAreas) {
    response[area.id] = area
  }

  return c.json(response)
})

export default app
