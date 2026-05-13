# Forge — new tables design

**Date:** 2026-05-13
**Scope:** Schema additions for four areas listed as TODO in `forge/README.md`:
gold + stones inventory, worker profiles, push subscriptions, order messages.
**Integration strategy:** side-car tables only. Existing tables
(`users`, `clients`, `orders`, `order_stages`, `order_gemstones`,
`scope_items`, `stage_gemstone_logs`, `stage_templates`,
`stage_template_steps`, `invoices`, `notifications`) are not modified.
The one exception is a small update to the existing gold-loss trigger so it
reads the tolerance from `worker_profiles` instead of its current source.

## Goals

- Make gold purchases lot-tracked with FIFO consumption, so each order
  has a real cost-of-goods figure traceable back to a supplier.
- Mirror that for factory-supplied stones: lots in, allocations out.
- Give workers a real profile row that owns their gold-loss tolerance and
  specialisations, replacing whatever ad-hoc storage exists today.
- Persist FCM tokens so the existing `notifications.channel='push'` rows
  can actually be dispatched.
- Add a threaded message system per order with two visibility modes
  (client-facing and staff-internal).

## Non-goals

- Reconstructing the missing main schema migration. That's a separate
  effort; this spec assumes the existing schema is the baseline.
- Per-order cost analytics UI. We make the data available; reports come later.
- Push *dispatch* logic (Edge Function / cron). That's an implementation
  task on top of `push_subscriptions`, not part of the schema.
- Inventory of finished goods (the forge is build-to-order; no SKU stock).

## 1. Inventory — gold

### 1.1 `gold_suppliers`

```
id              uuid pk
name            text not null
contact_name    text
phone           text
email           text
address         text
notes           text
is_active       bool default true
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### 1.2 `gold_lots`

```
id                  uuid pk
supplier_id         uuid not null fk → gold_suppliers(id)
karat               text not null
                    -- '18K' / '22K' / '24K'; same vocabulary as orders.karat
purchased_grams     numeric(10,3) not null check (purchased_grams > 0)
purchase_cost_qar   numeric(12,2) not null check (purchase_cost_qar >= 0)
unit_cost_qar       numeric(12,4) generated always as
                    (purchase_cost_qar / purchased_grams) stored
remaining_grams     numeric(10,3) not null
                    check (remaining_grams >= 0
                       and remaining_grams <= purchased_grams)
purchase_date       date not null
invoice_ref         text
notes               text
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

Index on `(karat, purchase_date)` to drive FIFO selection.

### 1.3 `gold_consumption`

```
id              uuid pk
stage_id        uuid not null fk → order_stages(id) on delete restrict
lot_id          uuid not null fk → gold_lots(id) on delete restrict
grams           numeric(10,3) not null check (grams > 0)
consumed_at     timestamptz not null default now()
recorded_by     uuid fk → users(id)
notes           text
```

Indexes on `(stage_id)` and `(lot_id)`.

### 1.4 FIFO allocation

A SQL function `allocate_gold(p_stage_id uuid, p_karat text, p_grams numeric)`:

1. Looks up `orders.karat` via the stage's order; rejects if `p_karat`
   doesn't match.
2. Walks `gold_lots` where `karat = p_karat and remaining_grams > 0`
   ordered by `purchase_date asc, id asc`.
3. For each lot, inserts one `gold_consumption` row consuming
   `least(remaining_grams, p_grams_remaining)`.
4. Stops when `p_grams` is fully allocated, or raises if stock is
   insufficient (rollback the whole call — no partial allocation).

A `BEFORE INSERT` trigger on `gold_consumption` decrements
`gold_lots.remaining_grams` and rejects if it would go negative.

### 1.5 Relationship to `order_stages.gold_in_grams`

`order_stages.gold_in_grams` stays as-is — it represents what the worker
*declared* they took. `sum(gold_consumption.grams)` over a stage is what
the *system drew* from inventory. They should match; when they don't,
that's a reconciliation event for the owner to resolve. We do not
auto-correct.

## 2. Inventory — stones

### 2.1 `stone_suppliers`

Same columns as `gold_suppliers`.

### 2.2 `stone_lots`

```
id                  uuid pk
supplier_id         uuid not null fk → stone_suppliers(id)
stone_type          stone_type not null      -- existing enum
stone_shape         stone_shape              -- existing enum, nullable
size_mm             numeric(6,2)             -- nominal; longest axis for non-round
colour_grade        text
clarity_grade       text
cut_grade           text
cert_lab            text                     -- only for single-piece lots
cert_number         text
purchased_qty       int  not null check (purchased_qty > 0)
purchased_carats    numeric(10,3) not null check (purchased_carats > 0)
purchase_cost_qar   numeric(12,2) not null check (purchase_cost_qar >= 0)
unit_cost_qar       numeric(12,4) generated always as
                    (purchase_cost_qar / purchased_qty) stored
remaining_qty       int  not null
                    check (remaining_qty >= 0
                       and remaining_qty <= purchased_qty)
remaining_carats    numeric(10,3) not null
                    check (remaining_carats >= 0
                       and remaining_carats <= purchased_carats)
purchase_date       date not null
invoice_ref         text
notes               text
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

Index on `(stone_type, stone_shape, size_mm, purchase_date)` for lot
suggestion in the UI.

Single-stone lots are modelled as `purchased_qty = 1`. The cert lives on
the lot row in that case; `order_gemstones.cert_number` / `.cert_lab`
become redundant for factory-supplied single stones (left in place for
client-supplied stones, where the cert travels with the customer).

### 2.3 `stone_allocation`

```
id                  uuid pk
order_gemstone_id   uuid not null fk → order_gemstones(id) on delete restrict
lot_id              uuid not null fk → stone_lots(id) on delete restrict
qty_pieces          int     not null check (qty_pieces > 0)
carats              numeric(10,3) not null check (carats > 0)
allocated_at        timestamptz not null default now()
allocated_by        uuid fk → users(id)
notes               text
```

Indexes on `(order_gemstone_id)` and `(lot_id)`.

### 2.4 Allocation flow

Owner creates an `order_gemstones` row with
`source = 'factory_supplied'`. UI suggests matching lots by
`(stone_type, stone_shape, size_mm)`. Owner picks one, server action
inserts a `stone_allocation` row. A trigger on `stone_allocation`
decrements `stone_lots.remaining_qty` and `remaining_carats`, rejecting
on negatives. `client_supplied` rows skip allocation entirely — they're
already tracked by `stage_gemstone_logs`.

## 3. Worker profiles

### 3.1 `worker_profiles`

```
user_id                 uuid pk fk → users(id) on delete cascade
gold_loss_tolerance_pct numeric(5,2) not null default 2.00
working_hours           text                       -- free-form for now
hourly_rate_qar         numeric(10,2)              -- optional, cost analysis
hire_date               date
notes                   text
created_at              timestamptz default now()
updated_at              timestamptz default now()
```

One row per user with `role='worker'`. Enforced by a `BEFORE INSERT/UPDATE`
trigger that checks `users.role = 'worker'`. Cascading delete from `users`
removes the profile.

### 3.2 `specialisation_types` (lookup)

```
id              smallserial pk
code            text unique not null
display_name    text not null
sort_order      smallint not null default 0
is_active       bool default true
```

Seeded in the migration with:

| code | display_name |
|---|---|
| casting | Casting |
| setting | Stone setting |
| polishing | Polishing |
| engraving | Engraving |
| assembly | Assembly |
| qc | Quality control |

### 3.3 `worker_specialisations` (many-to-many)

```
worker_user_id      uuid fk → worker_profiles(user_id) on delete cascade
specialisation_id   smallint fk → specialisation_types(id) on delete restrict
proficiency         text check (proficiency in
                                ('apprentice','journeyman','master'))
primary key (worker_user_id, specialisation_id)
```

### 3.4 Existing gold-loss trigger update

The gold-loss trigger (which sets `order_stages.gold_loss_flag` to
`normal | monitor | high | critical`) currently reads tolerance from
wherever it lives today. Update it to read
`worker_profiles.gold_loss_tolerance_pct` joined via
`order_stages.assigned_worker_id`. Fallback to a global default
(`2.00`) when no profile exists yet. This is the only modification to
existing-code behaviour in this spec.

## 4. Push subscriptions

### 4.1 `push_subscriptions`

```
id              uuid pk
user_id         uuid not null fk → users(id) on delete cascade
fcm_token       text not null
platform        text not null check (platform in ('web','ios','android'))
device_label    text                            -- "Chrome on MacBook"
user_agent      text                            -- web only
app_version     text                            -- native only
last_seen_at    timestamptz not null default now()
created_at      timestamptz not null default now()
```

Unique `(user_id, fcm_token)`. Indexes on `(user_id)` for fan-out and
`(last_seen_at)` for pruning.

### 4.2 Token lifecycle

- Client (web SW or native) calls a server action on login and on token
  refresh. The action upserts on `(user_id, fcm_token)` and bumps
  `last_seen_at`.
- A dispatcher (out of scope for this spec) reads pending
  `notifications` rows with `channel='push'`, looks up every
  `push_subscriptions` row for the recipient, fires to FCM.
- On FCM responses `404 Not Found` or `UNREGISTERED`, the dispatcher
  deletes that subscription row.
- A scheduled job deletes rows where
  `last_seen_at < now() - interval '90 days'`.

### 4.3 No changes to `notifications`

The `notifications` table is unchanged. `push_subscriptions` is purely
the address book for the existing `channel='push'` rows.

## 5. Order messages

### 5.1 `order_messages`

```
id              uuid pk
order_id        uuid not null fk → orders(id) on delete cascade
thread_type     text not null check (thread_type in ('client','internal'))
sender_id       uuid not null fk → users(id)
body            text not null check (length(body) between 1 and 4000)
is_system       bool not null default false
read_by         jsonb not null default '{}'::jsonb
                -- { "<user_id>": "<iso8601 read_at>" }
created_at      timestamptz not null default now()
edited_at       timestamptz
```

Indexes:

- `(order_id, thread_type, created_at desc)` — primary read pattern.
- `(sender_id, created_at desc)` — "my recent messages".

### 5.2 Visibility rules

- `thread_type='client'`: SELECT for owner, the order's assigned worker,
  and the order's client. INSERT for owner and client. Worker can read
  but not post — keeps the client-facing thread tidy.
- `thread_type='internal'`: SELECT and INSERT for owner and assigned
  worker. Client policy denies.

RLS policies enforce these. The check joins back to
`orders.assigned_worker_id` and `orders.client_id` (via `clients.user_id`).

### 5.3 `message_attachments`

```
id              uuid pk
message_id      uuid not null fk → order_messages(id) on delete cascade
storage_path    text not null
file_name       text not null
mime_type       text not null
size_bytes      int not null
created_at      timestamptz not null default now()
```

Index on `(message_id)`. Lives in a new storage bucket
`forge-message-attachments` with path prefix
`{order_id}/{thread_type}/...`. Bucket RLS mirrors the message visibility
rules. Add the bucket creation and policies to a new
`0010_message_storage_rls.sql` migration alongside the table migration.

### 5.4 System messages

Owner approves a stage / scope signs / invoice sent / payment received:
the corresponding server action inserts an `order_messages` row with
`is_system=true` into the client thread, body like
`"Stage 3 (Polishing) approved"`. Same triggers that already fan out to
`notifications` also fan out to this thread. No new tables; one helper
call in `lib/notify.ts`.

### 5.5 Read receipts

`read_by` is a sparse JSONB map keyed by user id. When a user opens the
thread, a server action merges their id and timestamp. UI shows
"seen by client at 14:32" by checking whether the client's user id is a
key in the map of the latest message in the thread. Avoids per-recipient
rows for a 2-3-person thread; can be migrated to a `message_reads`
relational table later without breaking the API.

## Migrations

Six new files, applied in order after the existing `0001`–`0004`:

| # | File | Contents |
|---|---|---|
| 0005 | `0005_inventory_gold.sql` | `gold_suppliers`, `gold_lots`, `gold_consumption`, `allocate_gold` function, consumption trigger |
| 0006 | `0006_inventory_stones.sql` | `stone_suppliers`, `stone_lots`, `stone_allocation`, allocation trigger |
| 0007 | `0007_worker_profiles.sql` | `worker_profiles`, `specialisation_types` (+ seed), `worker_specialisations`, role check trigger, gold-loss trigger update |
| 0008 | `0008_push_subscriptions.sql` | `push_subscriptions` table + indexes |
| 0009 | `0009_order_messages.sql` | `order_messages`, `message_attachments` + RLS policies |
| 0010 | `0010_message_storage_rls.sql` | `forge-message-attachments` bucket + storage RLS |

Each file is independently revertable (drop tables, restore prior
trigger body for 0007). RLS policies are added in the same file as the
tables they protect.

## TypeScript additions

`forge/lib/types.ts` gains:

```
GoldSupplier, GoldLot, GoldConsumption
StoneSupplier, StoneLot, StoneAllocation
WorkerProfile, SpecialisationType, WorkerSpecialisation
PushSubscription, PushPlatform
OrderMessage, MessageAttachment, ThreadType
```

No existing types change.

## Risks and mitigations

- **Gold-loss trigger change (0007)** — only existing-behaviour change.
  Mitigation: trigger has a fallback to the hardcoded default when no
  `worker_profiles` row exists, so applying the migration before
  backfilling profiles doesn't break existing stages.
- **Stones lot matching ambiguity** — `(stone_type, stone_shape, size_mm)`
  may not be unique enough for some workshops (two lots of "round 1.5mm
  diamonds" with different clarity). Mitigation: UI shows clarity /
  colour / cert when suggesting lots; final pick is manual.
- **FCM token refresh** — clients that don't call the refresh action
  silently lose push delivery when their token rotates. Mitigation:
  acceptable for v1; surface via "you haven't received push in N days"
  banner later if it becomes a problem.
- **Read-receipt JSONB scale** — fine for 2-3 readers per thread.
  Mitigation: if threads ever grow (group customers, multiple workers),
  migrate to a `message_reads` table.

## Out of scope (deferred)

- Push dispatcher (Edge Function consuming the pending `channel='push'`
  notifications).
- Inventory reporting UI / cost-of-goods rollups.
- Worker scheduling beyond the free-form `working_hours` field.
- Group messaging (multi-client or multi-worker per order).
- Reconciliation UI for `gold_in_grams` ≠ `sum(gold_consumption.grams)`.
