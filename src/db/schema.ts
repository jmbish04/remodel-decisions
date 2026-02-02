import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

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
  type: text("type"), // 'radio' | 'checkbox' from JSON
  sortOrder: integer("sort_order").notNull(),
});

export const items = sqliteTable("items", {
  id: text("id").primaryKey(), // e.g., 'f1_1', or UUID for new items
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  label: text("label").notNull(),
  note: text("note"), // Mapped from 'desc' in JSON or 'note'
  price: integer("price"), // Added from JSON
  isChecked: integer("is_checked", { mode: "boolean" }).default(false).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: text("level").notNull(),
  component: text("component").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const budgetItems = sqliteTable("budget_items", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(), // "Ordered", "Pending", "Decision Needed", "Estimating"
  cost: real("cost").notNull(),
  variance: real("variance").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
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
