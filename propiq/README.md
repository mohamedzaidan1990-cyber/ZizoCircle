# PropIQ — AI-Native Real Estate CRM

Multi-tenant SaaS CRM for real estate agencies in Qatar and the GCC.

## Status

**Week 1 foundation is in place:**

- Turborepo monorepo with `apps/web`, `apps/api`, `packages/shared`
- Docker Compose: PostgreSQL 15, Redis 7, MailHog
- Express 5 API with Prisma (public schema) and raw SQL (per-tenant schema)
- Auth: register / login / refresh / logout with bcrypt + JWT + refresh tokens
- Per-agency `tenant_<slug>` schema is provisioned automatically on register
- Next.js 14 frontend with `next-intl` (English LTR + Arabic RTL)
- Protected dashboard shell with sidebar, header, language toggle, logout

**Not yet implemented (Weeks 2–6):** contacts, properties, pipeline, AI features, communication, portal feeds, reports.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker Desktop

## First-time setup

```bash
cd propiq
pnpm install

cp .env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/api/.env — at minimum set ANTHROPIC_API_KEY and a strong JWT_SECRET.

pnpm docker:up                # start PostgreSQL, Redis, MailHog
pnpm db:generate              # generate Prisma client
pnpm db:push                  # apply public schema to local Postgres
```

## Run dev

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001 (health: http://localhost:3001/health)
- MailHog UI: http://localhost:8025

## Test the auth + tenant flow

1. Open http://localhost:3000 — you should be redirected to `/en/login`.
2. Click **Create an agency**, register with a slug like `acme_qatar`.
3. After register you land on the dashboard.
4. In a separate terminal verify the tenant schema was created:

   ```bash
   docker exec -it propiq_postgres psql -U propiq -d propiq -c "\dn"
   ```

   You should see `tenant_acme_qatar`.

5. Toggle to Arabic via the header button — layout flips to RTL.
6. Log out, log back in, refresh the page — the dashboard remains accessible.

## Project layout

```
propiq/
├── apps/
│   ├── api/         # Express 5 + Prisma + Postgres + JWT + tenant provisioning
│   └── web/         # Next.js 14 + next-intl (en/ar) + Tailwind + RHF + Zod
├── packages/
│   └── shared/      # Shared TypeScript types consumed by api + web
├── docker-compose.yml
├── turbo.json
└── package.json     # Workspace root
```

## Propify integration

PropIQ is integrated with **Propify** (WhatsApp lead qualification bot). Propify
qualifies inbound WhatsApp leads from PropertyFinder, scores them 0–100, and
POSTs hot/warm leads into PropIQ's per-tenant `contacts` and `deals` tables.

```
apps/
├── web/                    # Next.js (Vercel)
│   ├── public/propify-demo.html        ← static demo, calls /api/propify/claude
│   └── app/[locale]/(dashboard)/leads/ ← Propify Leads board
├── api/                    # Express (Railway)
│   └── src/routes/propify.ts
│       POST /api/propify/claude   – Anthropic proxy (rate-limited, public)
│       POST /api/propify/lead     – Webhook from propify-backend (Bearer secret)
│       GET  /api/propify/leads    – Tenant-scoped list (JWT auth)
└── propify-backend/        # Node.js / 360dialog WhatsApp webhook (Railway)
    └── server.js
```

The Next.js app rewrites `/api/propify/*` → `${NEXT_PUBLIC_API_URL}/api/propify/*`,
so the static demo and the leads page both reach Express through the same
public origin.

### New env vars

apps/api/.env

```env
PROPIFY_WEBHOOK_SECRET="strong-shared-secret"
ADDITIONAL_CORS_ORIGINS=""        # optional comma-separated origins
```

apps/propify-backend/.env

```env
ANTHROPIC_API_KEY=sk-ant-...
DIALOG360_API_KEY=...
AGENT_PHONE_NUMBER=97450000000
PROPIQ_API_URL=https://propiq-api.up.railway.app
PROPIFY_WEBHOOK_SECRET=same-as-apps/api
PROPIQ_TENANT_SLUG=acme_qatar
PORT=3000
```

### Tenant schema migration

The Propify integration adds columns to per-tenant `contacts` and `deals`. New
tenants are provisioned with the columns automatically. To upgrade a tenant
created before this integration shipped:

```ts
import { migratePropifySchema } from "./db/tenant";
await migratePropifySchema("acme_qatar");
```

### Deployment topology

| Service               | Host    | Notes                                            |
| --------------------- | ------- | ------------------------------------------------ |
| `apps/web`            | Vercel  | Static + serverless. Rewrite to API.             |
| `apps/api`            | Railway | Long-running Express. Same Postgres as Prisma.   |
| `apps/propify-backend`| Railway | Long-running webhook. Separate service.          |
| PostgreSQL + Redis    | Railway | Shared across `apps/api` (and `apps/propify-backend` if it ever needs them). |

> Note: `propify-demo.html` in this repo is a stub. The full 839-line Propify
> demo HTML provided to the project owner needs to be pasted in. The script
> already calls `/api/propify/claude`, so no JS changes are required.

## Production swap (Azure)

Only environment variables and one storage service file change — application code stays the same. See the build prompt for details.
