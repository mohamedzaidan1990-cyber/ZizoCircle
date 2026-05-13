"use client";

import { useTransition, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { allocateOrderStoneFromInventory } from "./actions";
import type { InventoryItem } from "@/lib/types";
import type { ActionState } from "@/lib/actions";

function formatStock(item: InventoryItem): string {
  const qty = item.stock_qty;
  const carats = item.stone_attrs?.carats_total;
  const unit = item.unit ?? "pcs";
  if (carats != null) {
    return `${qty} ${unit} · ${carats.toFixed(3)} ct`;
  }
  return `${qty} ${unit}`;
}

function AllocateRowForm({
  orderId,
  item,
}: {
  orderId: string;
  item: InventoryItem;
}) {
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState("");
  const [carats, setCarats] = useState("");
  const [state, setState] = useState<ActionState>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qtyNum = Number(qty);
    const caratsNum = Number(carats);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      setState({ error: "Quantity must be a positive integer." });
      return;
    }
    if (!caratsNum || caratsNum <= 0) {
      setState({ error: "Carats must be a positive number." });
      return;
    }
    startTransition(async () => {
      const result = await allocateOrderStoneFromInventory(
        orderId,
        item.id,
        qtyNum,
        caratsNum
      );
      setState(result);
      if (result?.success) {
        setQty("");
        setCarats("");
      }
    });
  }

  return (
    <li className="border-b last:border-b-0 px-0 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {item.stone_attrs?.stone_type ?? "—"}
            {item.stone_attrs?.stone_shape
              ? ` · ${item.stone_attrs.stone_shape.replace("_", " ")}`
              : ""}
            {item.stone_attrs?.size_mm != null
              ? ` · ${item.stone_attrs.size_mm} mm`
              : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Available: {formatStock(item)}
          </p>
          {item.supplier_name && (
            <p className="text-xs text-muted-foreground">
              Supplier: {item.supplier_name}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`qty-${item.id}`} className="text-xs">
              Pieces
            </Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="qty"
              className="w-20 h-8 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`carats-${item.id}`} className="text-xs">
              Carats
            </Label>
            <Input
              id={`carats-${item.id}`}
              type="number"
              min="0.0001"
              step="0.0001"
              value={carats}
              onChange={(e) => setCarats(e.target.value)}
              placeholder="ct"
              className="w-24 h-8 text-sm"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="h-8">
            {isPending ? "Allocating…" : "Allocate"}
          </Button>
        </form>
      </div>
      {state?.error && (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-1 text-xs text-emerald-700">{state.success}</p>
      )}
    </li>
  );
}

export function InventoryAllocateForm({
  orderId,
  items,
}: {
  orderId: string;
  items: InventoryItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No stone inventory items with stock available.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <AllocateRowForm key={item.id} orderId={orderId} item={item} />
      ))}
    </ul>
  );
}
