import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// 1. Areas (e.g., "1st Floor General", "Kitchen & Living")
export const areas = sqliteTable("areas", {
  id: text("id").primaryKey(), // e.g., 'floor1_general'
  title: text("title").notNull(),
  icon: text("icon").notNull(), // Icon name string
  sortOrder: integer("sort_order").notNull(),
});

// 2. Categories (e.g., "Flooring Decisions", "Entryway")
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  areaId: text("area_id").references(() => areas.id).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

// 3. Items (The actual checklist tasks)
export const items = sqliteTable("items", {
  id: text("id").primaryKey(), // Using the specific IDs like 'f1_1', 'kl1'
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  label: text("label").notNull(),
  note: text("note"), // Nullable
  isChecked: integer("is_checked", { mode: "boolean" }).default(false).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

// --- Relations ---

export const areasRelations = relations(areas, ({ many }) => ({
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  area: one(areas, {
    fields: [categories.areaId],
    references: [areas.id],
  }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));
