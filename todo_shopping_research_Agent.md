Task: specific Drizzle schema update for "Budget Items" and implement a corresponding update_budget tool for the Research Agent.

Context: We are moving from in-memory mock data to a persistent D1 database.

Schema: The budget_items table must match the provided TypeScript interface.

Capability: The ResearchAgent needs a tool to update these items. (Example use case: The agent finds a specific fridge price online and updates the "Appliance" budget line item with the real cost).

Step 1: Update Drizzle Schema
Action: Edit src/db/schema.ts. Define the budget_items table to match the BudgetItem interface.

Requirements:

Table Name: budget_items

Columns:

id: Text (Primary Key, default to generic UUID/CUID if not provided)

name: Text (Not null)

category: Text

status: Text (Store values: "Ordered", "Pending", "Decision Needed", "Estimating")

cost: Real/Integer

variance: Real/Integer (Default 0)

created_at: Integer (Timestamp)

Code Reference:

TypeScript

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const budgetItems = sqliteTable("budget_items", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(), // Application layer handles enum validation
  cost: real("cost").notNull(),
  variance: real("variance").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
Migration: Reminder to User: Run pnpm drizzle-kit generate and pnpm drizzle-kit migrate after saving this file.

Step 2: Create the Budget Tool
Action: Create a new tool definition (using AI SDK v6 standard) in src/tools/budget-tools.ts (or append to your existing tools file).

Tool Specification:

Name: update_budget_item

Description: "Update the cost, status, or details of a budget item. Use this when you have found a price for an item (e.g. a fridge) and need to record it."

Logic: Use Drizzle to perform an UPSERT (Insert, or Update on Conflict). Note: Since names might be unique for this workflow, you may want to look up by name if ID isn't provided, or strictly require ID.

Implementation Draft:

TypeScript

import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db"; // Your drizzle client instance
import { budgetItems } from "../db/schema";

export const updateBudgetTool = tool({
  description: "Update or create a budget item with researched pricing.",
  parameters: z.object({
    name: z.string().describe("The name of the item (e.g. 'French Oak Flooring')"),
    cost: z.number().describe("The researched cost of the item"),
    status: z.enum(["Ordered", "Pending", "Decision Needed", "Estimating"]).optional(),
    category: z.string().optional(),
    variance: z.number().optional()
  }),
  execute: async ({ name, cost, status, category, variance }) => {
    // 1. Check if item exists by name (Simple logic for now)
    const existing = await db.select().from(budgetItems).where(eq(budgetItems.name, name)).get();

    if (existing) {
      // Update
      await db.update(budgetItems)
        .set({ 
          cost, 
          status: status || existing.status,
          variance: variance ?? existing.variance 
        })
        .where(eq(budgetItems.id, existing.id));
      return { action: "updated", item: name, new_cost: cost };
    } else {
      // Create New
      const newId = crypto.randomUUID();
      await db.insert(budgetItems).values({
        id: newId,
        name,
        cost,
        category: category || "Uncategorized",
        status: status || "Estimating",
        variance: variance || 0
      });
      return { action: "created", item: name, cost };
    }
  },
});
Step 3: Register Tool with Research Agent
Action: Update src/agents/research-agent.ts. Import updateBudgetTool and add it to the tools object in the streamText call.

TypeScript

// ... inside onChatMessage ...
const result = streamText({
  model: openai("gpt-4o"),
  messages: this.messages,
  tools: {
    // ... existing browser tools ...
    updateBudget: updateBudgetTool, 
  },
});