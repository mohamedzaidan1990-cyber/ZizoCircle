import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDate } from "@/lib/format";
import type { Order, Client } from "@/lib/types";

type OrderWithClient = Order & { clients: Pick<Client, "full_name"> | null };

export default async function OwnerDashboard() {
  const supabase = createClient();

  const [{ data: orders }, { count: totalOrders }, { count: openOrders }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*, clients(full_name)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled)"),
    ]);

  const recent = (orders ?? []) as OrderWithClient[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Recent orders and quick actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/owner/clients/new" className={buttonVariants({ variant: "outline" })}>
            New client
          </Link>
          <Link href="/owner/orders/new" className={buttonVariants()}>
            New order
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total orders" value={totalOrders ?? 0} />
        <StatCard label="Open orders" value={openOrders ?? 0} />
        <StatCard label="Awaiting approval" value={recent.filter((o) => o.status === "in_production").length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders yet.{" "}
              <Link href="/owner/orders/new" className="underline">
                Create the first one
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2">Order</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Piece</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 font-medium">{o.order_number}</td>
                    <td className="py-2">{o.clients?.full_name ?? "—"}</td>
                    <td className="py-2">
                      {o.piece_type} · {o.karat}
                    </td>
                    <td className="py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-2 text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="py-2 text-right">
                      <Link href={`/owner/orders/${o.id}`} className="text-primary hover:underline">
                        Open
                      </Link>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
