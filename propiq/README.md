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

## Production swap (Azure)

Only environment variables and one storage service file change — application code stays the same. See the build prompt for details.
