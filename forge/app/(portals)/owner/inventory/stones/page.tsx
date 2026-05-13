import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listStoneItems } from "@/lib/db/inventory";
import { formatQAR, formatCarats } from "@/lib/format";

export default async function StoneParcelsPage() {
  await requireRole("owner");

  const items = await listStoneItems(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stone parcels</h1>
          <p className="text-sm text-muted-foreground">
            Latest 50 stone parcel items, most recent first.
          </p>
        </div>
        <Link href="/owner/inventory/stones/new" className={buttonVariants()}>
          Add parcel
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">No stone parcels yet.</p>
              <Link
                href="/owner/inventory/stones/new"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Add first parcel
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Shape</th>
                    <th className="px-4 py-3">Size (mm)</th>
                    <th className="px-4 py-3">Stock qty</th>
                    <th className="px-4 py-3">Total carats</th>
                    <th className="px-4 py-3">Unit cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 capitalize">
                        {item.stone_attrs?.stone_type?.replace("_", " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {item.stone_attrs?.stone_shape?.replace("_", " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.stone_attrs?.size_mm != null
                          ? `${item.stone_attrs.size_mm} mm`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.stock_qty} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        {formatCarats(item.stone_attrs?.carats_total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.cost_per_unit_qar != null
                          ? `${formatQAR(item.cost_per_unit_qar)}/${item.unit}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
