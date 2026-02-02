# AGENTS.md

## 1. Project Context & Goals

- **Project Name:** Renovate OS (formerly remodel-decisions)
- **Description:** A unified platform for managing home renovation budgets, decisions, and research.
- **Primary Goal:** Merge the local backend logic with the existing remote Astro frontend into a **Single Cloudflare Worker Monolith**.

> **CRITICAL WARNING:** The main branch contains an active Astro frontend in the `frontend/` directory. **DO NOT** overwrite the root `package.json` or `astro.config.mjs` with a fresh Worker template. You must merge the backend dependencies and logic into the existing structure.

---

## 2. Technical Architecture (The "Single Worker" Stack)

We are deploying a single Cloudflare Worker that serves both the UI (Static Assets + SSR) and the API.

| Layer                 | Technology         | Details                                                         |
| :-------------------- | :----------------- | :-------------------------------------------------------------- |
| **Runtime**           | Cloudflare Workers | `compatibility_date: "2024-09-23"`                              |
| **Entry Point**       | TypeScript         | `src/worker.ts` (Hono Entrypoint)                               |
| **Frontend**          | Astro 5 + React 19 | "True Dark" Shadcn UI. Source in `frontend/`. Builds to `dist/` |
| **Backend Framework** | Hono               | Uses `@hono/zod-openapi`                                        |
| **Database**          | D1 (SQLite)        | Managed via Drizzle ORM                                         |
| **Documentation**     | Swagger UI         | Served dynamically at `/swagger`                                |
| **Validation**        | Zod                | Shared schemas for API and Frontend types                       |
| **Asset Hosting**     | Worker Assets      | Configured in `wrangler.jsonc`                                  |

---

## 3. Directory Structure Standards

The codebase **MUST** adhere to this Monolith structure to prevent overwrite conflicts.

```text
/
├── .dev.vars                # Local Secrets
├── wrangler.jsonc           # Single config for Worker + Assets + D1
├── package.json             # SHARED dependencies (Astro + Hono + Drizzle)
├── drizzle.config.ts        # Database config
├── astro.config.mjs         # Astro Configuration (points to ./frontend)
├── tailwind.config.mjs      # Shared Tailwind config
├── src/                     # BACKEND SOURCE (Cloudflare Worker)
│   ├── worker.ts            # MAIN ENTRYPOINT: Hono app + Static Asset handler
│   ├── db/
│   │   ├── schema.ts        # Drizzle Schema (BudgetItems, etc.)
│   │   └── index.ts         # Drizzle Client init
│   ├── api/                 # Hono API Routes
│   │   ├── index.ts         # API Router definition
│   │   └── routes/          # Organized by domain (e.g., budget/)
│   └── services/            # Business Logic (D1 interactions)
└── frontend/                # FRONTEND SOURCE (Astro)
    ├── pages/               # UI Routes
    ├── components/          # React/Shadcn Components
    └── lib/                 # Frontend utilities (fetchers, utils)

```

---

## 4. Development Rules (Strict)

### A. The "Merge" Protocol (Anti-Overwrite)

When merging backend and frontend:

1. **Respect Existing Configs:** Do **NOT** delete `astro.config.mjs` or the existing `package.json`.
2. **Dependency Merge:** Add backend dependencies (Hono, Drizzle, etc.) to the existing `package.json` rather than creating a new one.
3. **Routing Strategy (In `src/worker.ts`):**

- **First:** Check for API routes (`/api/*`, `/swagger`, `/openapi.json`) -> Handle with Hono.
- **Second:** Serve Static Assets (Astro build) -> Handle with Cloudflare Assets binding (`env.ASSETS`).
- **Fallback:** Return 404 or index.html (SPA mode if applicable).

### B. API Development (Hono + OpenAPI)

- All API endpoints must be defined using `@hono/zod-openapi`.
- **Operation IDs:** EVERY route definition **MUST** include a unique `operationId` (e.g., `getBudgetSummary`). This is mandatory for client SDK generation.
- **Strict Zod Schemas:** Request bodies and Response bodies must be defined with Zod.
- **Docs:** Hono must serve the specification at `/openapi.json` and UI at `/swagger`.

**Example Pattern:**

```typescript
// src/api/routes/budget.ts
import { createRoute } from "@hono/zod-openapi";

export const getBudgetRoute = createRoute({
  method: "get",
  path: "/api/budget",
  operationId: "getBudgetItems", // <--- MANDATORY
  responses: {
    200: {
      content: { "application/json": { schema: BudgetItemsSchema } },
      description: "Retrieve budget items",
    },
  },
});
```

### C. Database Interactions

- **Drizzle Only:** Never write raw SQL unless absolutely necessary.
- **Schema Source:** The master schema lives in `src/db/schema.ts`.
- **Migrations:** Schema changes must be done via `drizzle-kit generate` and `drizzle-kit migrate`.

### D. Frontend Standards

- **Location:** All UI code lives strictly in `frontend/`.
- **Components:** Use existing Shadcn components in `frontend/components/ui`.
- **Data Fetching:** The frontend **MUST** fetch data from the local `/api/...` endpoints, replacing any mock data found in `src/services/budget.ts`.

---

## 5. Deployment Workflow

The Agent should use the following sequence to deploy the merged monolith:

1. **Type Gen:** `pnpm wrangler types` (Updates `worker-configuration.d.ts` with D1 & Asset bindings).
2. **Build Frontend:** `pnpm run build` (Runs `astro build`, outputting to `dist/`).
3. **Deploy:** `pnpm wrangler deploy` (Uploads the `src/worker.ts` logic AND the `dist/` assets).

---

## 6. Immediate Roadmap (Agent Tasks)

1. **Scaffold Hono:** Create `src/worker.ts` and `src/api` structure using `@hono/zod-openapi`.
2. **Port DB Schema:** Move the `BudgetItem` interfaces from `src/services/budget.ts` into a Drizzle `src/db/schema.ts`.
3. **Create API Endpoints:** Implement `GET /api/budget` and `POST /api/budget/update` to read/write to D1.
4. **Connect Frontend:** Update `frontend/pages/index.astro` to fetch from these new API endpoints instead of the mock file.
5. **Final Config:** Ensure `wrangler.jsonc` has `assets: { directory: "./dist", binding: "ASSETS" }`.
