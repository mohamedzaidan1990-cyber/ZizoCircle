# Sougha Concepts

Jewelry workshop management platform. Next.js 14 (App Router) + Supabase.

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

Apply the migrations in order:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_auth_bootstrap.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_storage_rls.sql
```

- **0001_auth_bootstrap** — `auth.users → public.users` trigger that links a
  pre-created users row by email or inserts a new one with `role='client'`. Also
  adds a self-update RLS policy for the users table.
- **0002_storage_rls** — creates the 5 storage buckets (`forge-stage-photos`,
  `forge-issue-photos`, `forge-scope-pdfs`, `forge-invoice-pdfs`, `forge-avatars`)
  and the row-level policies. Path conventions used by app code:
  `{order_id}/{stage_id}/...` for stage photos, `{order_id}/...` for issue and
  scope, `{invoice_id}/...` for invoices, `{forge_user_id}/...` for avatars.

Then promote your first owner manually:

```sql
UPDATE public.users SET role = 'owner' WHERE email = 'you@example.com';
```

## Email (Resend)

`lib/notify.ts` writes a `notifications` row for every portal user it can reach
and, if `RESEND_API_KEY` is set, also fires an email via Resend. Emails contain
a CTA back to the relevant page (resolved against `NEXT_PUBLIC_APP_URL`).

Without a Resend key the app still works — notifications get persisted, you just
won't see emails. Verify your sending domain in Resend before going live;
`onboarding@resend.dev` only delivers to the address that owns the API key.

Notification triggers wired:

| Event                          | Recipient            | Type                |
| ------------------------------ | -------------------- | ------------------- |
| Owner sends scope to client    | Client               | `scope_ready`       |
| Client signs scope             | Owners               | `scope_signed`      |
| Worker submits a stage         | Owners               | `stage_submitted`   |
| Owner approves a stage         | Client               | `stage_approved`    |
| Owner approves the last stage  | Client               | `order_completed`   |
| Owner requests rework          | Assigned worker      | `stage_rework`      |
| Owner sends invoice            | Client               | `invoice_sent`      |
| Owner records deposit/balance  | Client               | `payment_received`  |

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
- Invoices: list, create draft, send (emails the client), record deposit,
  record balance, cancel. Each payment writes an `accounting_ledger` row
  (`deposit_received` / `invoice_payment`, `is_credit=true`,
  `reference_type='invoice'`) and bumps `clients.total_spent_qar`. Status
  transitions: `draft → sent → partially_paid → paid` (or skips
  `partially_paid` when deposit is 0% or 100%).

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
- Invoices list + read-only invoice detail (line items, totals, payment status).

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

- Invoice + scope PDF generation (we persist URLs; rendering not wired)
- Push channel delivery (rows tagged `channel='push'` when user has no email; nothing dispatches them yet)
- WhatsApp / SMS channels
- Order messages thread (`order_messages` table is in the schema)
- Inventory / gold purchase pages
- Worker profile UI (specialisations, tolerance editing)
- Overdue auto-flag on invoices (cron / scheduled function)
- React Query: most reads are server components today; convert highly-interactive flows where it helps
- Tests
