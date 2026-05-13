import { createClient } from "@/lib/supabase/server";
import type {
  GoldSupplier,
  GoldPurchase,
  StoneSupplier,
  InventoryItem,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Column lists
// ---------------------------------------------------------------------------

const GOLD_SUPPLIER_COLUMNS =
  "id, name, contact_name, phone, email, address, notes, is_active, created_at, updated_at";

const GOLD_PURCHASE_COLUMNS =
  "id, purchase_date, supplier_id, supplier_name, karat, weight_grams, price_per_gram, total_cost_qar, remaining_grams, invoice_ref, notes, created_by, created_at, updated_at";

const STONE_SUPPLIER_COLUMNS =
  "id, name, contact_name, phone, email, address, notes, is_active, created_at, updated_at";

const INVENTORY_ITEM_COLUMNS =
  "id, name, category, sku, unit, stock_qty, reorder_threshold, cost_per_unit_qar, supplier_id, supplier_name, stone_attrs, notes, last_restocked_at, created_at, updated_at";

// ---------------------------------------------------------------------------
// Inline join types (not exported to lib/types.ts)
// ---------------------------------------------------------------------------

type GoldPurchaseWithSupplier = GoldPurchase & {
  supplier: GoldSupplier | null;
};

type InventoryItemWithSupplier = InventoryItem & {
  supplier: StoneSupplier | null;
};

// ---------------------------------------------------------------------------
// List helpers
// ---------------------------------------------------------------------------

export async function listGoldSuppliers(): Promise<GoldSupplier[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("gold_suppliers")
    .select(GOLD_SUPPLIER_COLUMNS)
    .order("name", { ascending: true });
  return (data ?? []) as GoldSupplier[];
}

export async function listStoneSuppliers(): Promise<StoneSupplier[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stone_suppliers")
    .select(STONE_SUPPLIER_COLUMNS)
    .order("name", { ascending: true });
  return (data ?? []) as StoneSupplier[];
}

export async function listGoldPurchases(
  limit?: number
): Promise<GoldPurchaseWithSupplier[]> {
  const supabase = createClient();
  let query = supabase
    .from("gold_purchases")
    .select(
      `${GOLD_PURCHASE_COLUMNS}, supplier:gold_suppliers(${GOLD_SUPPLIER_COLUMNS})`
    )
    .order("purchase_date", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data } = await query;
  return (data ?? []) as unknown as GoldPurchaseWithSupplier[];
}

export async function listStoneItems(
  limit?: number
): Promise<InventoryItemWithSupplier[]> {
  const supabase = createClient();
  let query = supabase
    .from("inventory_items")
    .select(
      `${INVENTORY_ITEM_COLUMNS}, supplier:stone_suppliers(${STONE_SUPPLIER_COLUMNS})`
    )
    .eq("category", "stone")
    .gt("stock_qty", 0)
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data } = await query;
  return (data ?? []) as unknown as InventoryItemWithSupplier[];
}

// ---------------------------------------------------------------------------
// Dashboard summary helpers
// ---------------------------------------------------------------------------

export async function goldStockByKarat(): Promise<
  Array<{ karat: string; total_remaining_grams: number; lot_count: number }>
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("gold_purchases")
    .select("karat, remaining_grams")
    .gt("remaining_grams", 0);

  const rows = (data ?? []) as Array<{
    karat: string;
    remaining_grams: number;
  }>;

  // Aggregate client-side: Supabase JS client doesn't expose GROUP BY directly.
  const map = new Map<
    string,
    { karat: string; total_remaining_grams: number; lot_count: number }
  >();

  for (const row of rows) {
    const existing = map.get(row.karat);
    if (existing) {
      existing.total_remaining_grams += Number(row.remaining_grams);
      existing.lot_count += 1;
    } else {
      map.set(row.karat, {
        karat: row.karat,
        total_remaining_grams: Number(row.remaining_grams),
        lot_count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.karat.localeCompare(b.karat)
  );
}

export async function stoneStockByType(): Promise<
  Array<{ stone_type: string; total_qty: number; item_count: number }>
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("stock_qty, stone_attrs")
    .eq("category", "stone")
    .gt("stock_qty", 0);

  const rows = (data ?? []) as Array<{
    stock_qty: number;
    stone_attrs: { stone_type?: string } | null;
  }>;

  const map = new Map<
    string,
    { stone_type: string; total_qty: number; item_count: number }
  >();

  for (const row of rows) {
    const stoneType = row.stone_attrs?.stone_type ?? "other";
    const existing = map.get(stoneType);
    if (existing) {
      existing.total_qty += Number(row.stock_qty);
      existing.item_count += 1;
    } else {
      map.set(stoneType, {
        stone_type: stoneType,
        total_qty: Number(row.stock_qty),
        item_count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.stone_type.localeCompare(b.stone_type)
  );
}

export async function lowStockStoneItems(): Promise<InventoryItem[]> {
  const supabase = createClient();
  // Fetch stones with a reorder_threshold set, then filter client-side
  // because Supabase JS doesn't support column-to-column comparisons directly.
  const { data } = await supabase
    .from("inventory_items")
    .select(INVENTORY_ITEM_COLUMNS)
    .eq("category", "stone")
    .not("reorder_threshold", "is", null)
    .order("stock_qty", { ascending: true });

  const rows = (data ?? []) as InventoryItem[];
  return rows.filter(
    (item) =>
      item.reorder_threshold !== null && item.stock_qty <= item.reorder_threshold
  );
}

// ---------------------------------------------------------------------------
// Order matching helper
// ---------------------------------------------------------------------------

export async function findMatchingStoneItems(
  stoneType: string,
  stoneShape?: string,
  sizeMm?: number
): Promise<InventoryItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("inventory_items")
    .select(INVENTORY_ITEM_COLUMNS)
    .eq("category", "stone")
    .gt("stock_qty", 0)
    .eq("stone_attrs->>stone_type" as string, stoneType);

  if (stoneShape !== undefined) {
    query = query.eq(
      "stone_attrs->>stone_shape" as string,
      stoneShape
    );
  }

  if (sizeMm !== undefined) {
    query = query.eq("stone_attrs->>size_mm" as string, String(sizeMm));
  }

  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as InventoryItem[];
}
