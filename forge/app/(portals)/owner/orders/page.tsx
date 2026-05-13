import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDate } from "@/lib/format";
import type { Client, Order } from "@/lib/types";

type Row = Order & { clients: Pick<Client, "full_name"> | null };

export default async function OrdersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, clients(full_name)")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            All orders across every status.
          </p>
        </div>
        <Link href="/owner/orders/new" className={buttonVariants()}>
          New order
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Piece</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{o.order_number}</td>
                    <td className="px-4 py-3">{o.clients?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {o.piece_type} · {o.karat}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.current_stage_number > 0 ? `Stage ${o.current_stage_number}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/owner/orders/${o.id}`}
                        className="text-primary hover:underline"
                      >
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
