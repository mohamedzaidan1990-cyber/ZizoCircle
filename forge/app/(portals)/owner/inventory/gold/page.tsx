import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listGoldPurchases } from "@/lib/db/inventory";
import { formatGrams, formatQAR, formatDate } from "@/lib/format";

export default async function GoldLotsPage() {
  await requireRole("owner");

  const lots = await listGoldPurchases(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gold lots</h1>
          <p className="text-sm text-muted-foreground">
            Latest 50 gold purchase lots, most recent first.
          </p>
        </div>
        <Link href="/owner/inventory/gold/new" className={buttonVariants()}>
          Add purchase
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {lots.length === 0 ? (
            <div className="p-6 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">No gold lots yet.</p>
              <Link
                href="/owner/inventory/gold/new"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Add first purchase
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Karat</th>
                    <th className="px-4 py-3">Purchased</th>
                    <th className="px-4 py-3">Remaining</th>
                    <th className="px-4 py-3">Unit cost</th>
                    <th className="px-4 py-3">Invoice ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lots.map((lot) => {
                    const pct =
                      lot.weight_grams > 0
                        ? Math.round(
                            (lot.remaining_grams / lot.weight_grams) * 100
                          )
                        : 0;
                    return (
                      <tr key={lot.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(lot.purchase_date)}
                        </td>
                        <td className="px-4 py-3">
                          {lot.supplier?.name ?? lot.supplier_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{lot.karat}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatGrams(lot.weight_grams)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span>{formatGrams(lot.remaining_grams)}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({pct}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatQAR(lot.price_per_gram)}/g
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lot.invoice_ref ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
