import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  goldStockByKarat,
  stoneStockByType,
  lowStockStoneItems,
} from "@/lib/db/inventory";
import { formatGrams } from "@/lib/format";

export default async function InventoryDashboardPage() {
  await requireRole("owner");

  const [goldStock, stoneStock, lowStock] = await Promise.all([
    goldStockByKarat(),
    stoneStockByType(),
    lowStockStoneItems(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Gold stock and stone parcel overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/owner/suppliers/gold"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Gold suppliers
          </Link>
          <Link
            href="/owner/suppliers/stones"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Stone suppliers
          </Link>
        </div>
      </div>

      {/* Gold stock summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Gold stock</h2>
          <div className="flex gap-2">
            <Link
              href="/owner/inventory/gold/new"
              className={buttonVariants({ size: "sm" })}
            >
              Add purchase
            </Link>
            <Link
              href="/owner/inventory/gold"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all lots
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {goldStock.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No gold stock yet.{" "}
                <Link
                  href="/owner/inventory/gold/new"
                  className="underline underline-offset-2"
                >
                  Add a purchase
                </Link>
                .
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Karat</th>
                    <th className="px-4 py-3">Total remaining</th>
                    <th className="px-4 py-3">Lot count</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {goldStock.map((row) => (
                    <tr key={row.karat}>
                      <td className="px-4 py-3 font-medium">{row.karat}</td>
                      <td className="px-4 py-3">
                        {formatGrams(row.total_remaining_grams)}
                      </td>
                      <td className="px-4 py-3">{row.lot_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Stone stock summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Stone stock</h2>
          <div className="flex gap-2">
            <Link
              href="/owner/inventory/stones/new"
              className={buttonVariants({ size: "sm" })}
            >
              Add parcel
            </Link>
            <Link
              href="/owner/inventory/stones"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all parcels
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {stoneStock.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No stone stock yet.{" "}
                <Link
                  href="/owner/inventory/stones/new"
                  className="underline underline-offset-2"
                >
                  Add a parcel
                </Link>
                .
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Stone type</th>
                    <th className="px-4 py-3">Total qty</th>
                    <th className="px-4 py-3">Item count</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stoneStock.map((row) => (
                    <tr key={row.stone_type}>
                      <td className="px-4 py-3 font-medium capitalize">
                        {row.stone_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">{row.total_qty}</td>
                      <td className="px-4 py-3">{row.item_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-destructive">
            Low stock — reorder soon
          </h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Item name</th>
                    <th className="px-4 py-3">Current qty</th>
                    <th className="px-4 py-3">Reorder threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-destructive font-medium">
                        {item.stock_qty}
                      </td>
                      <td className="px-4 py-3">{item.reorder_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
