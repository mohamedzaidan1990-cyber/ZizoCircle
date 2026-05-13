# Forge — inventory UI (Wave 1)

**Date:** 2026-05-13
**Wave:** 1 of 4 in the "build UI for new tables" sequence
(Wave 2 = worker profile edit; Wave 3 = order messages threads;
Wave 4 = push subscriptions + drop `users.push_token`.)
**Branch:** `claude/forge-inventory-ui` (PR target: `main`).
**Depends on:** migrations `0005`–`0010` already applied to project
`qbmxwaxezifsnysxyyez` (commits `dee9bca`…`0055f7d`, merged into `main`
at `7508ba5`).

## Goal

Give the owner first-class UI for the new inventory tables added in the
migration sprint: gold purchases (lot-tracked), stone parcels (via
generic `inventory_items` + `stone_attrs`), and their respective
suppliers (`gold_suppliers`, `stone_suppliers`). Wire the existing stage
and order-stones flows into the new FIFO allocator and the inventory
transactions table so the data actually moves when work happens.

## Non-goals

- Worker / client visibility into inventory (owner-only for Wave 1).
- Edit / delete on suppliers (add-only this wave; lifecycle later).
- Stock write-offs / adjustments / damage reporting beyond what
  `inventory_transactions` already supports raw.
- Cost-of-goods / margin reports / dashboards beyond a simple
  stock-on-hand summary.
- Reorder-threshold automation (column exists in `inventory_items`; no
  alerts/notifications this wave).
- Backfilling existing `gold_purchases.supplier_name` text into the new
  `supplier_id` FK.

## Routes

All under `(portals)/owner/`. Permission: `requireRole('owner')` server-side
(matches existing `clients`, `workers`, `invoices` patterns).

| Path | Purpose | Components |
|---|---|---|
| `/owner/inventory` | Dashboard: per-karat gold totals + per-stone-type totals + low-stock callouts (rows where `stock_qty <= reorder_threshold`). | server component, plain table |
| `/owner/inventory/gold` | List of `gold_purchases` (joined to `gold_suppliers`). Columns: date, supplier, karat, purchased_grams, remaining_grams (bar), unit_cost. | server component, table |
| `/owner/inventory/gold/new` | Form to add a gold purchase. | client form (`'use client'`) + server action |
| `/owner/inventory/stones` | List of `inventory_items WHERE category='stone'` joined to `stone_suppliers`. Columns: name, type, shape, size, stock_qty, remaining_carats (computed from stone_attrs), unit_cost. | server component, table |
| `/owner/inventory/stones/new` | Form to add a stone parcel. | client form + server action |
| `/owner/suppliers/gold` | List of `gold_suppliers`. | server component, table |
| `/owner/suppliers/gold/new` | Form to add a gold supplier. | client form + server action |
| `/owner/suppliers/stones` | List of `stone_suppliers`. | server component, table |
| `/owner/suppliers/stones/new` | Form to add a stone supplier. | client form + server action |

**Decision:** suppliers get their own `new/` route (matching the existing
`workers` and `clients` pattern: separate `page.tsx` + `new/page.tsx`),
not an inline form. Consistency over saving routes.

## Order-flow integrations

Two existing pages get small additions, not rewrites.

### `/owner/orders/[id]/stages/[stageNumber]/page.tsx`

When the displayed `OrderStage` has a non-null `gold_in_grams` and there
are no existing `gold_consumption` rows for this stage:
- Show an "Allocate from inventory" button.
- Server action calls `allocate_gold(stage_id, karat, grams)` (the karat
  comes from the parent order). On success, refetches consumption rows
  and renders an "Allocated: 30g from lot A (2026-04-01), 10g from lot B
  (2026-05-01)" summary.
- On insufficient-stock error, surface the message from `RAISE
  EXCEPTION` directly (the function's error message is user-friendly).

When `gold_consumption` rows already exist for this stage:
- Replace the button with the breakdown summary (read-only).
- Add a "Reverse allocation" link that deletes the rows. (Deleting
  triggers the `gold_consumption_decrement_lot` trigger — but that's an
  AFTER INSERT trigger; deleting won't restore `remaining_grams` automatically.)
- **Open question:** reversal needs an explicit handler that re-adds the
  grams to `gold_purchases.remaining_grams`. Decision: in Wave 1, the
  reverse-allocation link is **deferred** (not implemented). Owner has to
  do it via Supabase SQL if needed. We don't want to ship a half-baked
  reversal flow.

### `/owner/orders/[id]/stones/page.tsx`

Currently this page lets the owner issue `order_gemstones` rows (per the
existing `issue-form.tsx`). Add:
- A tab/toggle: "Client supplied" (existing flow, unchanged) vs.
  "From inventory" (new flow).
- "From inventory" view:
  - A picker that filters `inventory_items WHERE category='stone' AND
    stock_qty > 0` by `stone_attrs->>'stone_type'`,
    `stone_attrs->>'stone_shape'`, `(stone_attrs->>'size_mm')::numeric`.
  - Owner selects a lot + enters qty (≤ `remaining_qty`) and carats.
  - Server action wraps two inserts in a transaction:
    1. `INSERT INTO order_gemstones (...)` with `source='factory_supplied'`,
       attributes copied from `stone_attrs`.
    2. `INSERT INTO inventory_transactions (item_id, order_id, qty_change,
       reason)` with `qty_change = -qty`, `reason = 'order_alloc'`.
    The existing `inventory_transactions_sync_stock_tr` trigger decrements
    `stock_qty`; if it can't (overdraw), the whole transaction rolls back.

## Components and files

### New files

```
forge/app/(portals)/owner/inventory/page.tsx
forge/app/(portals)/owner/inventory/gold/page.tsx
forge/app/(portals)/owner/inventory/gold/new/page.tsx
forge/app/(portals)/owner/inventory/gold/new/gold-purchase-form.tsx     -- client
forge/app/(portals)/owner/inventory/gold/new/actions.ts                 -- server actions
forge/app/(portals)/owner/inventory/stones/page.tsx
forge/app/(portals)/owner/inventory/stones/new/page.tsx
forge/app/(portals)/owner/inventory/stones/new/stone-parcel-form.tsx    -- client
forge/app/(portals)/owner/inventory/stones/new/actions.ts               -- server actions
forge/app/(portals)/owner/suppliers/gold/page.tsx
forge/app/(portals)/owner/suppliers/gold/new/page.tsx
forge/app/(portals)/owner/suppliers/gold/new/supplier-form.tsx          -- client
forge/app/(portals)/owner/suppliers/gold/new/actions.ts                 -- server actions
forge/app/(portals)/owner/suppliers/stones/page.tsx
forge/app/(portals)/owner/suppliers/stones/new/page.tsx
forge/app/(portals)/owner/suppliers/stones/new/supplier-form.tsx        -- client
forge/app/(portals)/owner/suppliers/stones/new/actions.ts               -- server actions
forge/lib/db/inventory.ts                                                -- query helpers
```

19 new files.

### Modified files

```
forge/components/owner/owner-nav.tsx       -- add Inventory + Suppliers entries
forge/app/(portals)/owner/orders/[id]/stages/[stageNumber]/page.tsx
forge/app/(portals)/owner/orders/[id]/stages/[stageNumber]/actions.ts   -- allocate_gold action
forge/app/(portals)/owner/orders/[id]/stones/page.tsx
forge/app/(portals)/owner/orders/[id]/stones/issue-form.tsx             -- add "From inventory" tab
forge/app/(portals)/owner/orders/[id]/stones/actions.ts                 -- inventory allocation action
```

6 modified files.

### Library / pattern conformance

- All page components are server components (default in Next.js App
  Router) that read from Supabase server client (`lib/supabase/server.ts`).
- Mutations live in `actions.ts` files co-located with the form. Each
  action returns an `ActionState` and uses `requireRole('owner')` for
  authorization (existing helper in `lib/auth.ts`).
- Forms use `useFormStatus` via the existing `SubmitButton` in
  `components/forms/`.
- UI primitives reused from `components/ui/` (cards, tables, inputs).
- New query helpers grouped in `lib/db/inventory.ts` (matches whatever
  exists in `lib/db/` already).

## Server actions — contracts

### Suppliers

```ts
addGoldSupplier(prevState, formData) → ActionState
addStoneSupplier(prevState, formData) → ActionState
```

Fields: `name` (required), `contact_name`, `phone`, `email`, `address`,
`notes`. Validates non-empty `name`, optional email format.

### Gold purchases

```ts
addGoldPurchase(prevState, formData) → ActionState
```

Fields: `supplier_id` (UUID, required), `karat` (one of '18K','21K','22K','24K'),
`weight_grams` (positive numeric), `price_per_gram` (non-negative numeric),
`purchase_date` (date, defaults to today), `invoice_ref` (optional),
`notes` (optional). Server inserts; `remaining_grams` is set to
`weight_grams` and `updated_at` defaults. Returns the new lot id for
optional redirect.

### Stone parcels

```ts
addStoneParcel(prevState, formData) → ActionState
```

Fields:
- `supplier_id` (UUID, required)
- `name` (required — short label like "Round 1.5mm VS diamonds — A")
- `unit` ('piece' default, or 'carat' for very large stones — but qty
  always tracked in `stock_qty` as pieces for now)
- `stock_qty` (positive int)
- `cost_per_unit_qar` (non-negative numeric, optional)
- `stone_type` (enum value, required)
- `stone_shape` (enum value, optional)
- `size_mm` (numeric, optional)
- `colour_grade`, `clarity_grade`, `cut_grade` (text, optional)
- `cert_lab`, `cert_number` (text, optional — for single-stone lots)
- `carats_total` (numeric, optional)
- `notes` (text, optional)

Server assembles `stone_attrs` JSONB from the stone-specific fields and
inserts with `category='stone'`.

### Stage gold allocation

In `/owner/orders/[id]/stages/[stageNumber]/actions.ts`, new:

```ts
allocateStageGold(stageId, karat, grams) → ActionState
```

Calls `supabase.rpc('allocate_gold', { p_stage_id, p_karat, p_grams })`.
Returns the inserted `gold_consumption` rows for display.

### Order stone inventory allocation

In `/owner/orders/[id]/stones/actions.ts`, new:

```ts
allocateStoneFromInventory(orderId, itemId, qtyPieces, carats) → ActionState
```

Single Supabase RPC call (to a new SQL function added in this wave —
declared inline below). Reason: a 2-step JS-orchestrated insert can't
roll back if step 2 fails inside RLS. A server-side function gives
atomicity.

New SQL function added in this wave (Wave 1 migration `0011`):

```sql
CREATE OR REPLACE FUNCTION public.allocate_stone_from_inventory(
  p_order_id    uuid,
  p_item_id     uuid,
  p_qty_pieces  int,
  p_carats      numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item record;
  v_gem_id uuid;
BEGIN
  SELECT * INTO v_item FROM inventory_items
   WHERE id = p_item_id AND category = 'stone' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item % is not a stone parcel', p_item_id;
  END IF;
  IF v_item.stock_qty < p_qty_pieces THEN
    RAISE EXCEPTION 'insufficient stock: have %, need %',
      v_item.stock_qty, p_qty_pieces;
  END IF;

  INSERT INTO order_gemstones (
    order_id, stone_type, stone_shape,
    qty_pieces, total_carats,
    colour_grade, clarity_grade, cut_grade,
    cert_lab, cert_number,
    source, estimated_value_qar, issue_photo_url
  ) VALUES (
    p_order_id,
    (v_item.stone_attrs->>'stone_type')::stone_type,
    (v_item.stone_attrs->>'stone_shape')::stone_shape,
    p_qty_pieces,
    p_carats,
    v_item.stone_attrs->>'colour_grade',
    v_item.stone_attrs->>'clarity_grade',
    v_item.stone_attrs->>'cut_grade',
    v_item.stone_attrs->>'cert_lab',
    v_item.stone_attrs->>'cert_number',
    'factory_supplied',
    p_qty_pieces * COALESCE(v_item.cost_per_unit_qar, 0),
    'from_inventory'  -- placeholder; UI doesn't require an issue photo here
  ) RETURNING id INTO v_gem_id;

  INSERT INTO inventory_transactions (
    item_id, order_id, qty_change, reason, created_by
  ) VALUES (
    p_item_id, p_order_id, -p_qty_pieces,
    'order_alloc',
    (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  );

  RETURN v_gem_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_stone_from_inventory
  TO authenticated;
```

This is **owner-only** by virtue of the `inventory_items` and
`order_gemstones` RLS policies — the `SECURITY DEFINER` declaration
elevates only to the migration runner, but a permission check on
`(SELECT role FROM users WHERE supabase_auth_id = auth.uid()) = 'owner'`
inside the function is needed to actually fail closed for non-owners:

```sql
IF NOT EXISTS (
  SELECT 1 FROM users
   WHERE supabase_auth_id = auth.uid() AND role = 'owner'
) THEN
  RAISE EXCEPTION 'permission denied';
END IF;
```

Add this guard as the first statement in the function body.

## Migration for this wave

```
forge/supabase/migrations/0011_allocate_stone_function.sql
```

Contains the `allocate_stone_from_inventory()` function above. Apply via
the Supabase MCP as in earlier sprint. Also write a test file
`0011_allocate_stone_function.test.sql` that exercises the happy path
and the overdraw / non-owner cases.

This is the **only schema change** in Wave 1.

## TypeScript additions

`forge/lib/types.ts` already has the data types from the migration
sprint. No new types needed for Wave 1 (the action contracts can use
inline `FormData` types).

## Owner nav

`forge/components/owner/owner-nav.tsx` is a flat list of
`{ href, label, match }` items. Add **one** new entry between Workers
and Invoices:

```ts
{ href: "/owner/inventory", label: "Inventory",
  match: /^\/owner\/(inventory|suppliers)/ }
```

The `match` regex covers both `/owner/inventory/*` and
`/owner/suppliers/*` so the entry stays highlighted across both
sub-trees. Suppliers are reached via cards/links on the inventory
dashboard rather than from the top nav.

## Empty / loading / error states

For every list page:
- **Empty:** "No gold purchases yet. [Add purchase]" centered card.
- **Loading:** rely on Next.js `loading.tsx` if a parent has it;
  otherwise a streaming Suspense boundary isn't required for Wave 1.
- **Error:** server component throws a clear message; an
  `error.tsx` at `/owner/inventory/` catches it. (Forge already has
  error boundaries — match existing pattern.)

For every form:
- Validation errors surfaced via `ActionState.errors`.
- Server error message surfaced via `ActionState.error`.
- Submit button uses `useFormStatus` for pending state.

## Risks

- **Reverse allocation gap:** if an owner allocates gold then
  the stage is later cancelled or re-submitted with different grams,
  there is no UI to give the grams back. Wave 1 ships the forward path
  only; reversal is a deliberate Wave 1.5 / Wave 2.5 item. Flag in the
  PR.
- **`issue_photo_url` placeholder for inventory-sourced stones:** the
  existing `order_gemstones.issue_photo_url` is NOT NULL in the live
  schema. The function inserts `'from_inventory'` as a placeholder
  string. This is functional but ugly. A real Wave 2 polish item would
  be to relax the NOT NULL constraint to allow factory-supplied stones
  without an explicit issue photo. Flag.
- **Single supplier table per category:** if the same vendor sells both
  gold and stones (likely!), the owner has to add them twice — once in
  `gold_suppliers`, once in `stone_suppliers`. Accepted trade-off from
  the earlier "separated suppliers" decision; flag in PR description.
- **Stone parcel `name` is owner-typed:** no enforced naming convention,
  so the list view can get messy. Wave 1 accepts this; a future feature
  could auto-generate names from attrs.

## Out of scope (deferred to later waves)

- Editing / deleting suppliers (Wave 1 = add-only).
- Editing / deleting gold lots and stone parcels (Wave 1 = add-only).
- Reverse-allocation UI.
- Cost-of-goods / margin reports.
- Reorder-threshold alerts.
- Low-stock notifications via `notifications` table.
- Translation / RTL polish for inventory pages (existing portal already
  has language_pref handling — match what's done for clients/workers).
