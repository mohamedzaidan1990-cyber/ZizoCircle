import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatQAR, statusLabel } from "@/lib/format";
import type { Invoice, Order } from "@/lib/types";

type Row = Invoice & { orders: Pick<Order, "order_number" | "piece_type"> | null };

const variantFor = (status: Invoice["status"]) =>
  status === "paid"
    ? "success"
    : status === "overdue" || status === "cancelled"
    ? "danger"
    : status === "partially_paid" || status === "sent"
    ? "warning"
    : "muted";

export default async function ClientInvoicesPage() {
  const client = await getClientForCurrentUser();
  if (!client) {
    return (
      <div className="mx-auto max-w-xl p-6 text-sm text-muted-foreground">
        Your account isn't linked to a client record yet.
      </div>
    );
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, orders(order_number, piece_type)")
    .eq("client_id", client.id)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My invoices</h1>
          <p className="text-sm text-muted-foreground">
            Invoices issued for your orders.
          </p>
        </div>
        <Link href="/client" className="text-sm text-primary hover:underline">
          ← My orders
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No invoices yet.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/client/invoices/${i.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-muted/30"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {i.invoice_number}
                        {i.orders ? ` · ${i.orders.order_number} · ${i.orders.piece_type}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatQAR(i.total_qar)}
                        {i.due_date ? ` · due ${formatDate(i.due_date)}` : ""}
                      </div>
                    </div>
                    <Badge variant={variantFor(i.status)}>{statusLabel(i.status)}</Badge>
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
