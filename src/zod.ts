import { z } from '@hono/zod-openapi'

export const ItemSchema = z.object({
  id: z.string(),
  categoryId: z.number(),
  label: z.string(),
  note: z.string().nullable(),
  isChecked: z.boolean(),
  sortOrder: z.number()
}).openapi('Item')

export const CategorySchema = z.object({
  id: z.number(),
  areaId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  items: z.array(ItemSchema)
}).openapi('Category')

export const AreaSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  sortOrder: z.number(),
  categories: z.array(CategorySchema)
}).openapi('Area')

export const ChecklistResponseSchema = z.record(AreaSchema).openapi('ChecklistResponse')

export const ErrorSchema = z.object({
  message: z.string()
}).openapi('Error')

// Request Schemas
export const UpdateStatusSchema = z.object({
  isChecked: z.boolean()
})

export const UpdateNoteSchema = z.object({
  note: z.string()
})

export const CreateItemSchema = z.object({
  label: z.string(),
  note: z.string().optional()
})

export const ItemIdParam = z.object({
  id: z.string()
})

export const CategoryIdParam = z.object({
  categoryId: z.string().transform((v) => parseInt(v, 10)).openapi({ type: 'integer' })
})
