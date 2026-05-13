# Forge — new tables design

**Date:** 2026-05-13
**Status:** Revised (v2). The original v1 spec assumed several tables didn't
exist that in fact already do in the live Supabase project
`qbmxwaxezifsnysxyyez`. v1 is preserved in git at commit `1582806`. This
revision drops colliding `CREATE TABLE`s in favour of `ALTER TABLE`s and
adopts the existing generic inventory / messages tables.

**Source of truth for "current schema":** the live DB introspected via
Supabase MCP `list_tables(schemas=['public'], verbose=true)`. Not
`forge/lib/types.ts` — that file is incomplete and behind.

**Scope:** schema additions / alterations for the four areas listed as TODO
in `forge/README.md`: gold + stones inventory, worker profiles, push
delivery, order messages.

**Integration strategy:** mostly *extend* existing tables. New side-car
tables only where the existing schema has no equivalent (suppliers,
gold_consumption, message_attachments, push_subscriptions).

## What already exists (live DB)

| Existing table | Relevance |
|---|---|
| `worker_profiles` | Has `id uuid pk`, `user_id`, `specialisation text[]`, `gold_loss_tolerance_pct numeric default 5.00`, `hourly_rate_qar`, `notes`. Missing: `working_hours`, `hire_date`, `updated_at`. No m2m specialisation lookup. |
| `order_messages` | Single thread per order. Columns: `order_id`, `sender_id`, `body`, `attachment_url text` (single), `read_at timestamptz` (single reader). Missing: thread split, multi-attachment, per-user read receipts, `is_system`, `edited_at`. |
| `gold_purchases` | Event log of purchases. Columns: purchase_date, supplier_name (text), karat, weight_grams, price_per_gram, total_cost_qar (generated). Missing: `remaining_grams` and FIFO consumption. |
| `inventory_items` + `inventory_transactions` | Generic stock + ledger system. Columns on inventory_items: name, category, sku, unit, stock_qty, reorder_threshold, cost_per_unit_qar, supplier_name. Transactions: item_id, order_id, qty_change, reason. No stone-specific attributes. |
| `users.push_token` | Single `text` column for one FCM token per user. |
| `accounting_ledger` | txn_type enum: gold_purchase, gemstone_purchase, labour_cost, overhead_expense, invoice_payment, deposit_received, refund, other. Not changed by this spec. |

## Goals

- Turn `gold_purchases` into lot-tracked stock by adding `remaining_grams`;
  add a `gold_consumption` table that links order_stages → gold_purchases
  with FIFO allocation.
- Make `inventory_items` viable for stones by adding `stone_attrs jsonb`;
  use `inventory_transactions` for stone allocation to orders.
- Add `gold_suppliers` and `stone_suppliers` lookup tables; ALTER the
  purchase / inventory tables to add nullable `supplier_id` FKs; keep
  free-text `supplier_name` for backfill compatibility.
- Extend `worker_profiles` with the missing fields and verify the
  gold-loss trigger reads from `worker_profiles.gold_loss_tolerance_pct`
  (it may already; if not, fix it).
- Add `push_subscriptions` for multi-device FCM. Keep `users.push_token`
  during the transition; deprecate in a future migration.
- Extend `order_messages` with `thread_type`, `read_by jsonb`,
  `is_system`, `edited_at`. Add a separate `message_attachments` table
  for multi-attach (existing `attachment_url` is preserved on
  order_messages for backfill).
- New storage bucket `forge-message-attachments` with RLS matching the
  message thread visibility.

## Non-goals

- Dropping `users.push_token`. Deprecation is a future migration.
- Reconciling `lib/types.ts` with the full live schema. That's a separate
  task (just type-file alignment, no schema change).
- Building a m2m specialisation lookup. The existing `specialisation text[]`
  on `worker_profiles` is adequate; no controlled vocabulary required.
- Reporting / cost-of-goods UI; this spec only adds data structures.
- Migrating any `order_messages.attachment_url` data into
  `message_attachments`. Live `order_messages` has zero rows.

## 1. Gold inventory

### 1.1 New `gold_suppliers`

```
id            uuid pk default gen_random_uuid()
name          text not null
contact_name  text
phone         text
email         text
address       text
notes         text
is_active     boolean not null default true
created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
```

### 1.2 ALTER `gold_purchases`

```
ALTER TABLE public.gold_purchases
  ADD COLUMN supplier_id     uuid REFERENCES public.gold_suppliers(id),
  ADD COLUMN remaining_grams numeric(10,3),
  ADD COLUMN updated_at      timestamptz NOT NULL DEFAULT now();

-- Backfill remaining_grams := weight_grams for every existing row.
UPDATE public.gold_purchases SET remaining_grams = weight_grams
 WHERE remaining_grams IS NULL;

ALTER TABLE public.gold_purchases
  ALTER COLUMN remaining_grams SET NOT NULL,
  ADD CONSTRAINT gold_purchases_remaining_in_range
    CHECK (remaining_grams >= 0 AND remaining_grams <= weight_grams);
```

`supplier_name` stays as a free-text column for unmigrated rows and ad-hoc
purchases where the owner hasn't picked from the suppliers list.

### 1.3 New `gold_consumption`

```
id            uuid pk default gen_random_uuid()
stage_id      uuid not null fk → order_stages(id) on delete restrict
purchase_id   uuid not null fk → gold_purchases(id) on delete restrict
grams         numeric(10,3) not null check (grams > 0)
consumed_at   timestamptz not null default now()
recorded_by   uuid fk → users(id)
notes         text
```

Indexes on `(stage_id)` and `(purchase_id)`. An `AFTER INSERT` trigger
decrements `gold_purchases.remaining_grams` and raises if it would go
negative.

### 1.4 `allocate_gold(p_stage_id, p_karat, p_grams)` function

Walks `gold_purchases WHERE karat = p_karat AND remaining_grams > 0`
ordered by `purchase_date ASC, id ASC`, inserts one `gold_consumption`
row per drawn-from purchase, raises on insufficient stock.

### 1.5 Relationship to `order_stages.gold_in_grams`

Unchanged. `order_stages.gold_in_grams` is what the worker declared;
`sum(gold_consumption.grams)` is what the system drew. Mismatches are a
reconciliation event for the owner — no auto-correct.

## 2. Stones inventory

The decision is to **reuse** the existing generic `inventory_items` +
`inventory_transactions` system rather than build dedicated stone tables.

### 2.1 New `stone_suppliers`

Same columns as `gold_suppliers`.

### 2.2 ALTER `inventory_items`

```
ALTER TABLE public.inventory_items
  ADD COLUMN supplier_id uuid REFERENCES public.stone_suppliers(id),
  ADD COLUMN stone_attrs jsonb;
```

`stone_attrs` is nullable. For rows where `category = 'stone'`, the JSONB
holds:

```jsonc
{
  "stone_type":    "diamond",         // matches public.stone_type enum
  "stone_shape":   "round",           // matches public.stone_shape enum
  "size_mm":       1.50,
  "colour_grade":  "G",
  "clarity_grade": "VS2",
  "cut_grade":     "EX",
  "cert_lab":      "GIA",
  "cert_number":   "1234567890",
  "carats_total":  10.000             // parcel total
}
```

For non-stone items (tools, supplies), `stone_attrs IS NULL`. Forge UI
only renders the stone fields when `category = 'stone'`.

A partial index `(stone_attrs->>'stone_type', stone_attrs->>'stone_shape',
(stone_attrs->>'size_mm')) WHERE category = 'stone' AND stock_qty > 0`
supports the "find matching stones" lookup at order time.

`supplier_id` FK targets `stone_suppliers` because stones are the only
inventory category currently in use; if other categories appear later
with structured supplier needs, this FK becomes a unified `suppliers`
table or splits per-category.

### 2.3 Stone allocation via `inventory_transactions`

No new allocation table. When an owner adds a factory-supplied
`order_gemstones` row, a server action also inserts an
`inventory_transactions` row with `qty_change` negative, `order_id`
set, `reason = 'order_alloc'`. A trigger keeps `inventory_items.stock_qty`
in sync.

If a `stock_qty` sync trigger does not already exist on
`inventory_transactions`, the 0006 migration adds it. The trigger
decrements / increments `inventory_items.stock_qty` by the inverse of
`qty_change` and raises on negative stock.

### 2.4 Linking inventory rows back to order_gemstones

`order_gemstones` is not modified. The link is via
`inventory_transactions.order_id` (already present) plus
`inventory_transactions.item_id`. A view
`v_order_stone_allocations(order_id, item_id, qty_pieces, carats_total,
allocated_at)` makes the join readable. Per-gem-row linkage isn't tracked
in this revision; if needed later, ALTER `inventory_transactions` to add a
nullable `order_gemstone_id` FK.

## 3. Worker profiles

### 3.1 ALTER `worker_profiles`

```
ALTER TABLE public.worker_profiles
  ADD COLUMN working_hours text,
  ADD COLUMN hire_date     date,
  ADD COLUMN updated_at    timestamptz NOT NULL DEFAULT now();
```

Existing fields preserved:
- `id uuid pk` (kept, even though spec preferred user_id-keyed — changing
  PK on a populated table is high-risk and the table has only 0 rows
  today but other code may reference `worker_profiles.id`).
- `user_id` (kept nullable — current schema doesn't enforce NOT NULL).
- `specialisation text[]` (kept; no controlled vocabulary added).
- `gold_loss_tolerance_pct numeric default 5.00` (kept; default stays at
  5.00 — changing it is a separate product decision).
- `hourly_rate_qar`, `notes`, `created_at`.

A separate add-only constraint: `UNIQUE (user_id)` to enforce 1:1 with
users. (Skip if there are existing duplicate user_ids — current rows: 0.)

### 3.2 Gold-loss trigger verification

The live schema's `order_stages.gold_loss_flag` column exists with the
right enum. Whether the trigger that sets it reads from `worker_profiles`
is unverified.

The 0007 migration's first step is to inspect the existing trigger via
`pg_get_functiondef`. If it already reads `worker_profiles.gold_loss_tolerance_pct`,
the migration only ALTERs `worker_profiles`. If it reads from somewhere
else (or doesn't exist), the migration adds / replaces the function to
do:

```
SELECT gold_loss_tolerance_pct INTO v_tolerance
  FROM public.worker_profiles
 WHERE user_id = NEW.assigned_worker_id
 LIMIT 1;
v_tolerance := COALESCE(v_tolerance, 5.00);
```

with fallback default of 5.00 (matching the column default).

## 4. Push subscriptions

### 4.1 New `push_subscriptions`

```
id            uuid pk default gen_random_uuid()
user_id       uuid not null fk → users(id) on delete cascade
fcm_token     text not null
platform      text not null check (platform in ('web','ios','android'))
device_label  text
user_agent    text
app_version   text
last_seen_at  timestamptz not null default now()
created_at    timestamptz not null default now()
unique (user_id, fcm_token)
```

Indexes on `(user_id)` and `(last_seen_at)`.

### 4.2 Transition strategy

- `users.push_token` is **kept**. Writes from the legacy single-token
  client code continue to work.
- New client code writes to `push_subscriptions` instead of (or in
  addition to) `users.push_token`.
- The push dispatcher (out of scope) reads from `push_subscriptions`
  first; if zero rows, falls back to `users.push_token`. This lets
  per-user migration happen on next login without a hard cutover.
- A future migration (not in this spec) drops `users.push_token`.

### 4.3 RLS

Users manage their own subscriptions; owners read all for debugging.
Service role bypasses RLS for dispatcher writes.

## 5. Order messages

### 5.1 ALTER `order_messages`

```
ALTER TABLE public.order_messages
  ADD COLUMN thread_type text NOT NULL DEFAULT 'client'
    CHECK (thread_type IN ('client','internal')),
  ADD COLUMN read_by   jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN edited_at timestamptz;

CREATE INDEX order_messages_thread_idx
  ON public.order_messages (order_id, thread_type, created_at DESC);

CREATE INDEX order_messages_sender_idx
  ON public.order_messages (sender_id, created_at DESC);
```

Existing columns preserved:
- `attachment_url text` — kept for backwards compatibility. New messages
  use the `message_attachments` table; old single-attachment messages
  still resolve via this column.
- `read_at timestamptz` — kept; legacy single-reader receipt. The new
  `read_by jsonb` is the system of record going forward
  (`{ "<user_id>": "<iso ts>" }`). Server actions write to both during a
  transition window.

Default of `thread_type = 'client'` backfills every existing row into the
client-visible thread, which matches today's behaviour where there's only
one thread per order.

### 5.2 New `message_attachments`

```
id           uuid pk default gen_random_uuid()
message_id   uuid not null fk → order_messages(id) on delete cascade
storage_path text not null
file_name    text not null
mime_type    text not null
size_bytes   int  not null check (size_bytes >= 0)
created_at   timestamptz not null default now()
```

Index on `(message_id)`. Lives in storage bucket
`forge-message-attachments` with path prefix `{order_id}/{thread_type}/...`.

### 5.3 RLS

Defined via a new helper `is_order_participant(order_id, thread_type)`:

- `thread_type='client'`: owner, the order's assigned worker, the order's
  client user can SELECT. INSERT for owner + the client user.
- `thread_type='internal'`: owner + assigned worker SELECT and INSERT.
  Client policy denies.
- Sender may UPDATE their own message body (sets `edited_at`).
- Participants may UPDATE `read_by` to merge their read receipt.
- `message_attachments` inherits visibility from its parent message.

### 5.4 System messages

Server actions (approve stage, scope signed, invoice sent, payment
received) insert an `is_system=true` row in the `client` thread
("Stage 3 (Polishing) approved"). Same triggers that already fan out to
`notifications` also fan out here. No new tables; one helper call added
to `lib/notify.ts`.

## 6. Migrations

Six new files applied in order:

| # | File | Contents |
|---|---|---|
| 0005 | `0005_gold_inventory.sql` | `gold_suppliers` table; ALTER `gold_purchases` (`supplier_id`, `remaining_grams`, `updated_at`, backfill, check constraint); new `gold_consumption` table + decrement trigger; `allocate_gold(...)` function; RLS on all new tables. |
| 0006 | `0006_stone_inventory.sql` | `stone_suppliers` table; ALTER `inventory_items` (`supplier_id`, `stone_attrs jsonb`); partial index for stone lookup; verify/add `inventory_transactions → inventory_items.stock_qty` sync trigger; `v_order_stone_allocations` view; RLS on `stone_suppliers`. |
| 0007 | `0007_worker_profile_extend.sql` | ALTER `worker_profiles` (add `working_hours`, `hire_date`, `updated_at`, unique on user_id); inspect existing gold-loss trigger and update only if it doesn't already read from `worker_profiles`. |
| 0008 | `0008_push_subscriptions.sql` | `push_subscriptions` table + RLS. `users.push_token` retained. |
| 0009 | `0009_order_messages_threads.sql` | ALTER `order_messages` (thread_type / read_by / is_system / edited_at); indexes; `message_attachments` table; `is_order_participant()` helper; RLS policies for both tables. |
| 0010 | `0010_message_storage_rls.sql` | `forge-message-attachments` bucket; `parse_message_attachment_path()` helper; storage RLS (select/insert/delete). |

Each file is independently revertable. ALTERs are additive (no drops), so
rollback is `DROP COLUMN` / `DROP CONSTRAINT` / `DROP TABLE` of just the
new objects.

## TypeScript additions

`forge/lib/types.ts` gets new types. Note: `lib/types.ts` is **already
incomplete** vs. the live DB — this spec's TS additions only cover the
new columns + new tables. A full reconciliation of `lib/types.ts` with
the live schema is a separate task.

New types:

```
GoldSupplier
GoldConsumption
StoneSupplier
StoneAttrs                                  // shape of inventory_items.stone_attrs
PushSubscription, PushPlatform
ThreadType ('client' | 'internal')
MessageAttachment
```

Updated types:

```
GoldPurchase            // add supplier_id, remaining_grams, updated_at
InventoryItem           // add supplier_id, stone_attrs
WorkerProfile           // add working_hours, hire_date, updated_at
OrderMessage            // add thread_type, read_by, is_system, edited_at
                        //    keep attachment_url, read_at for backcompat
User                    // expose push_token (currently used by app code,
                        //    not in types.ts — add it for honesty)
```

## Risks and mitigations

- **Gold-loss trigger ALTER (0007)** — only existing-behaviour change.
  Mitigation: inspect the trigger first; only replace the tolerance
  lookup if necessary; keep a 5.00 fallback so unprofiled workers still
  flag the same way they do today.
- **stone_attrs vs typed columns** — JSONB sacrifices DB-level type
  safety for flexibility. Mitigation: a CHECK constraint enforces
  required keys on stone-category rows
  (`stone_attrs ? 'stone_type'` etc.); app code validates the enum
  values before insert.
- **Two read-receipt columns coexist on order_messages** — `read_at`
  (legacy) and `read_by jsonb` (new). Mitigation: server actions write
  both during the transition; a follow-up migration drops `read_at`.
- **push_subscriptions vs users.push_token** — coexistence means
  delivery code has to check both. Mitigation: documented fallback rule
  in dispatcher (subscriptions first, push_token only if zero rows).
- **inventory_items.supplier_id FK to stone_suppliers** — narrows the
  generic table to a stone-specific FK target. Mitigation: acceptable
  while stones are the only structured-supplier category; revisit if
  other categories appear.
- **Partial-unique on worker_profiles.user_id** — if any row exists with
  NULL user_id (current count: 0), the unique constraint must use
  `WHERE user_id IS NOT NULL`. Migration validates row count before
  applying.

## Out of scope (deferred)

- Push dispatcher (Edge Function consuming pending `channel='push'`
  notifications).
- `users.push_token` deprecation migration.
- `order_messages.read_at` deprecation migration.
- Migrating any `order_messages.attachment_url` rows into
  `message_attachments` (currently zero rows).
- Reporting / cost-of-goods UI / inventory dashboards.
- Backfilling `gold_purchases.supplier_id` from existing `supplier_name`
  text values. Owner fills these in via UI as suppliers are entered.
- A m2m specialisation lookup table.
- Stone allocation per `order_gemstones` row (currently linked by
  `inventory_transactions.order_id`, not per-gem).
