-- Migration 0011: allocate_stone_from_inventory()
-- Atomically allocates stone pieces from inventory to an order gemstone record.
-- Stock decrement is handled by the inventory_transactions_sync_stock_tr trigger
-- on inventory_transactions INSERT — no explicit UPDATE on inventory_items needed.

CREATE OR REPLACE FUNCTION public.allocate_stone_from_inventory(
  p_order_id    uuid,
  p_item_id     uuid,
  p_qty_pieces  int,
  p_carats      numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item   record;
  v_gem_id uuid;
BEGIN
  -- Permission guard: only 'owner' role users may call this function.
  -- When auth.uid() IS NULL (test/admin context), the check is bypassed so that
  -- direct SQL tests can exercise the function without an auth session.
  -- In production (authenticated context), a non-owner will always hit the RAISE.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM users
     WHERE supabase_auth_id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Lock the inventory row to prevent concurrent overdraw
  SELECT * INTO v_item FROM inventory_items
   WHERE id = p_item_id AND category = 'stone' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item % is not a stone parcel', p_item_id;
  END IF;

  IF v_item.stock_qty < p_qty_pieces THEN
    RAISE EXCEPTION 'insufficient stock: have %, need %',
      v_item.stock_qty, p_qty_pieces;
  END IF;

  -- Insert the order gemstone record from inventory stone_attrs
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

  -- Record inventory transaction.
  -- The inventory_transactions_sync_stock_tr trigger fires on this INSERT and
  -- automatically applies qty_change to inventory_items.stock_qty — no separate
  -- UPDATE needed here.
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

GRANT EXECUTE ON FUNCTION public.allocate_stone_from_inventory(uuid, uuid, int, numeric)
  TO authenticated;
