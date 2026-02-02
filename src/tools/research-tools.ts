import { tool } from "ai";
import { z } from "zod";
import * as BrowserService from "../services/browser-rendering";
import { eq } from "drizzle-orm";
import { createDb } from "../db";
import { budgetItems } from "../db/schema";

export const createResearchTools = (env: Env) => {
  const db = createDb(env);

  return {
    browsePage: tool({
      description: "Visit a webpage and extract its content to find prices or product details.",
      parameters: z.object({ url: z.string().url() }),
      // @ts-ignore
      execute: async ({ url }: { url: string }) => {
        console.log(`[ResearchTool] Browsing ${url}`);
        const content = await BrowserService.renderMarkdown(env, url);
        return { content: content.slice(0, 5000) };
      }
    }),

    updateBudget: tool({
      description: "Update/Create a budget item with researched pricing.",
      parameters: z.object({
        name: z.string(),
        cost: z.number(),
        status: z.enum(["Ordered", "Pending", "Decision Needed", "Estimating"]).optional(),
        category: z.string().optional(),
      }),
      // @ts-ignore
      execute: async ({ name, cost, status, category }: { name: string, cost: number, status?: "Ordered" | "Pending" | "Decision Needed" | "Estimating", category?: string }) => {
        const existing = await db.select().from(budgetItems).where(eq(budgetItems.name, name)).get();

        if (existing) {
          await db.update(budgetItems)
            .set({ cost, status: status || existing.status })
            .where(eq(budgetItems.id, existing.id));
          return { action: "updated", item: name, cost };
        } else {
          await db.insert(budgetItems).values({
            id: crypto.randomUUID(),
            name,
            cost,
            category: category || "Uncategorized",
            status: status || "Estimating",
            variance: 0
          });
          return { action: "created", item: name, cost };
        }
      }
    })
  };
};
