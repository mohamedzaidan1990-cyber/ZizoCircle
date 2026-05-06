import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatQAR, statusLabel } from "@/lib/format";
import type { Invoice, Order, Client } from "@/lib/types";

type Row = Invoice & {
  orders: Pick<Order, "order_number"> | null;
  clients: Pick<Client, "full_name"> | null;
};

const variantFor = (status: Invoice["status"]) =>
  status === "paid"
    ? "success"
    : status === "overdue"
    ? "danger"
    : status === "partially_paid" || status === "sent"
    ? "warning"
    : "muted";

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, orders(order_number), clients(full_name)")
    .order("created_at", { ascending: false });
  const invoices = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Generate and track invoices per order.
          </p>
        </div>
        <Link href="/owner/invoices/new" className={buttonVariants()}>
          New invoice
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 font-medium">{i.invoice_number}</td>
                    <td className="px-4 py-3">{i.orders?.order_number ?? "—"}</td>
                    <td className="px-4 py-3">{i.clients?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">{formatQAR(i.total_qar)}</td>
                    <td className="px-4 py-3">{formatQAR(i.balance_due_qar)}</td>
                    <td className="px-4 py-3">{formatDate(i.due_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={variantFor(i.status)}>{statusLabel(i.status)}</Badge>
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
