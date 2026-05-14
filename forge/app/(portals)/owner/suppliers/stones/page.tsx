import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { listStoneSuppliers } from "@/lib/db/inventory";

export default async function StoneSuppliersPage() {
  await requireRole("owner");
  const suppliers = await listStoneSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stone Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Companies and individuals who supply gemstones and stones to the workshop.
          </p>
        </div>
        <Link href="/owner/suppliers/stones/new" className={buttonVariants()}>
          Add supplier
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-muted-foreground">No stone suppliers yet.</p>
              <Link href="/owner/suppliers/stones/new" className={buttonVariants({ variant: "outline" })}>
                Add your first supplier
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.contact_name ?? "—"}</td>
                    <td className="px-4 py-3">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3">{s.email ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {s.notes ? s.notes.slice(0, 60) + (s.notes.length > 60 ? "…" : "") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
