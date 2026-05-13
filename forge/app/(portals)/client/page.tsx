import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

export default async function ClientHomePage() {
  const client = await getClientForCurrentUser();
  const supabase = createClient();

  if (!client) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No client record</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account is not linked to a client record yet. Contact the workshop owner.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My orders</h1>
          <p className="text-sm text-muted-foreground">
            Track your pieces from design to delivery.
          </p>
        </div>
        <Link href="/client/invoices" className="text-sm text-primary hover:underline">
          Invoices →
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/client/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-muted/30"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {o.order_number} · {o.piece_type} · {o.karat}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {formatDate(o.created_at)}
                        {o.estimated_delivery
                          ? ` · ETA ${formatDate(o.estimated_delivery)}`
                          : ""}
                      </div>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
