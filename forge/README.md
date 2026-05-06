# Forge

Jewelry factory management platform. Next.js 14 (App Router) + Supabase.

## Stack

- Next.js 14 App Router (TypeScript, Server Actions)
- Supabase Auth + Postgres + Storage (`@supabase/ssr`)
- Tailwind CSS + shadcn-style primitives
- Zustand (client state)
- TanStack Query (server-state caching, set up but underused so far)

## Getting started

```bash
cd forge
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

`.env.local` is committed for the dev project (anon key only, public).

## One-time Supabase setup

1. Apply your main schema (already done).
2. Apply the auth bootstrap migration:

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_auth_bootstrap.sql
   ```

   This adds an `auth.users → public.users` trigger that:
   - Links by email to a pre-created users row (owner can pre-create workers and clients with their email).
   - Otherwise inserts a new users row with `role='client'`.

3. Promote your first owner manually:

   ```sql
   UPDATE public.users SET role = 'owner' WHERE email = 'you@example.com';
   ```

4. Storage buckets (private): `forge-stage-photos`, `forge-issue-photos`,
   `forge-scope-pdfs`, `forge-invoice-pdfs`. Public: `forge-avatars`. Add storage RLS so:
   - Owners can read/write all forge buckets.
   - Workers can write to `forge-stage-photos` and read photos for orders they're assigned to.
   - Clients can read photos on their own orders.

   This scaffold uses signed URLs via the server (`lib/storage.ts`), so as long as
   the server-side client is authenticated, signed URLs will work.

## Schema mapping

The auth layer reads from `public.users` (the schema you applied), keyed by
`supabase_auth_id = auth.uid()`. The `users.role` column drives portal routing.

Other tables consumed by the UI:

| Feature                | Table(s)                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Auth + roles           | `users`                                                              |
| Clients                | `clients`                                                            |
| Orders + pipeline      | `orders`, `stage_templates`, `stage_template_steps`, `order_stages`  |
| Scope of work          | `scope_items`                                                        |
| Gemstones              | `order_gemstones`, `stage_gemstone_logs`                             |
| Notifications          | `notifications`                                                      |
| Invoicing              | `invoices`                                                           |

All RLS policies are honored by relying on the cookie-bound Supabase client.

## What's wired up

### Auth
- Email + password signup/sign-in (`/login`)
- Auth callback (`/auth/callback`)
- Sign-out (`POST /auth/sign-out`)
- Middleware-based session refresh + role-based portal routing
- `requireRole(...)` guards every portal layout server-side

### Owner portal (`/owner`)
- Dashboard with stats + recent orders
- Orders: list, create (picks client, worker, stage template), detail with stage progress
- Reassign worker (also reassigns open stages)
- Scope builder: add/remove items, send to client (sets `scope_pending`); blocked once locked
- Gemstone issuance with required handover photo (uploaded to `forge-issue-photos`)
- Stage review: shows worker's photos, gold loss flag, stone reconciliation; approve or request rework
- Approval cascades order status → `in_production` → `quality_check` → `completed` and notifies client
- Clients: list + create (pre-creates a `users` row by email so the trigger can link on signup)
- Workers: list + create (pre-creates by email)
- Invoices: list + create (line items, deposit %, tax %); send + record-payment to come

### Worker portal (`/worker`)
- Jobs grouped by status (action / submitted / upcoming)
- Stage detail: start stage, upload photos (camera-friendly), worker notes
- Stone reconciliation form per gem batch — DB trigger flags discrepancies; UI hard-blocks submit if any
- Submit gates:
  - At least one photo required
  - Stone reconciliation must be clean
  - Gold weights validated when provided
- Submitting notifies all owners

### Client portal (`/client`)
- Orders list
- Order tracker: shows agreed scope, approved stages with photos
- **Scope sign-off**: tick every line, type your full name, sign. Captures timestamp,
  IP (from `x-forwarded-for` / `x-real-ip`), and user-agent. Sets `scope_locked = true`,
  `status = scope_signed`. Server enforces immutability afterwards.

## Project layout

```
forge/
├─ app/
│  ├─ (portals)/
│  │  ├─ owner/
│  │  │  ├─ orders/[id]/{scope,stones,stages/[stageNumber]}
│  │  │  ├─ clients/{,new}
│  │  │  ├─ workers/{,new}
│  │  │  └─ invoices/{,new}
│  │  ├─ worker/stages/[id]
│  │  └─ client/orders/[id]/scope
│  ├─ auth/{callback,sign-out}
│  ├─ login/
│  ├─ layout.tsx
│  ├─ page.tsx          # Role-based redirect
│  └─ providers.tsx
├─ components/
│  ├─ auth/
│  ├─ forms/            # SubmitButton (uses useFormStatus)
│  ├─ orders/           # status badges, stage progress
│  ├─ owner/            # owner-nav
│  ├─ photos/           # photo grid (signed URLs)
│  └─ ui/
├─ lib/
│  ├─ supabase/         # browser/server/middleware clients
│  ├─ db/               # query helpers
│  ├─ actions.ts        # ActionState helpers
│  ├─ auth.ts           # getCurrentUser, requireRole
│  ├─ format.ts         # currency, grams, dates
│  ├─ storage.ts        # upload + signed URL helpers
│  ├─ types.ts
│  └─ utils.ts
├─ store/auth.ts        # Zustand
├─ supabase/migrations/ # auth bootstrap + future migrations
└─ middleware.ts
```

## Business rules enforced

- **Scope immutability**: once `scope_locked = true`, owner add/remove and client toggle/sign actions all reject server-side. RLS already restricts client UPDATE to unlocked scopes.
- **Photo gate**: server action rejects stage submission if `photo_urls` is empty.
- **Stone reconciliation**: DB trigger flags rows with `qty_in_piece + loose + returned + damaged ≠ issued`. The submit action queries `discrepancy_flag` and refuses to submit if any are true. Owner approval also re-checks before approving.
- **Gold loss flag**: existing DB trigger calculates `gold_loss_pct` and flags `normal | monitor | high | critical` against the worker's tolerance. UI displays the flag everywhere stages are listed.
- **Audit on sign**: `scope_signed_at`, `scope_client_ip`, `scope_device_fp` are set server-side from request headers.

## What's still TODO

- Invoice send + payment recording (`status` transitions, deposit_paid_at, balance_paid_at, accounting_ledger entries)
- Invoice PDF + scope PDF generation (we only persist URLs; generation not wired)
- Notifications fan-out to push/email/whatsapp/sms (rows are inserted; delivery not wired)
- Order messages thread
- Inventory / gold purchase pages
- Worker profile UI (specialisations, tolerance editing)
- React Query: most reads are server components today; convert highly-interactive flows where it helps
- Tests
