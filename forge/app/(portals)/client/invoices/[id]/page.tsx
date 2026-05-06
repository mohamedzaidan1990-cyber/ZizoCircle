import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatDateTime,
  formatQAR,
  statusLabel,
} from "@/lib/format";
import type { Invoice, InvoiceLineItem, Order } from "@/lib/types";

const variantFor = (status: Invoice["status"]) =>
  status === "paid"
    ? "success"
    : status === "overdue" || status === "cancelled"
    ? "danger"
    : status === "partially_paid" || status === "sent"
    ? "warning"
    : "muted";

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await getClientForCurrentUser();
  if (!client) notFound();
  const supabase = createClient();

  const { data: invRow } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", client.id)
    .neq("status", "draft")
    .maybeSingle();
  if (!invRow) notFound();
  const inv = invRow as Invoice;

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, piece_type, karat")
    .eq("id", inv.order_id)
    .maybeSingle();
  const o = order as Pick<Order, "id" | "order_number" | "piece_type" | "karat"> | null;

  const lineItems = (Array.isArray(inv.line_items)
    ? (inv.line_items as InvoiceLineItem[])
    : []) as InvoiceLineItem[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/client/invoices" className="hover:underline">
            My invoices
          </Link>{" "}
          / {inv.invoice_number}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{inv.invoice_number}</h1>
          <Badge variant={variantFor(inv.status)}>{statusLabel(inv.status)}</Badge>
        </div>
        {o && (
          <p className="text-sm text-muted-foreground">
            For{" "}
            <Link href={`/client/orders/${o.id}`} className="hover:underline">
              {o.order_number}
            </Link>{" "}
            · {o.piece_type} · {o.karat}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Subtotal" value={formatQAR(inv.subtotal_qar)} />
            <Field
              label={`Tax (${Number(inv.tax_pct).toFixed(2)}%)`}
              value={formatQAR(inv.tax_amount_qar)}
            />
            <Field
              label="Total"
              value={<span className="font-semibold">{formatQAR(inv.total_qar)}</span>}
            />
            <Field label="Due date" value={formatDate(inv.due_date)} />
            <Field label="Sent" value={formatDateTime(inv.sent_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field
              label={`Deposit (${Number(inv.deposit_pct).toFixed(0)}%)`}
              value={
                <span>
                  {formatQAR(inv.deposit_amount_qar)}{" "}
                  {inv.deposit_paid_at ? (
                    <Badge variant="success">Received</Badge>
                  ) : inv.deposit_amount_qar > 0 ? (
                    <Badge variant="warning">Outstanding</Badge>
                  ) : null}
                </span>
              }
            />
            <Field
              label="Balance"
              value={
                <span>
                  {formatQAR(inv.balance_due_qar)}{" "}
                  {inv.balance_paid_at ? (
                    <Badge variant="success">Received</Badge>
                  ) : inv.balance_due_qar > 0 ? (
                    <Badge variant="warning">Outstanding</Badge>
                  ) : null}
                </span>
              }
            />
            {inv.deposit_paid_at && (
              <Field label="Deposit paid" value={formatDateTime(inv.deposit_paid_at)} />
            )}
            {inv.balance_paid_at && (
              <Field label="Balance paid" value={formatDateTime(inv.balance_paid_at)} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{li.label}</td>
                  <td className="px-4 py-2 text-right">{li.qty}</td>
                  <td className="px-4 py-2 text-right">{formatQAR(li.unit_price)}</td>
                  <td className="px-4 py-2 text-right">{formatQAR(li.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-4 py-2" colSpan={3}>
                  <span className="font-medium">Total</span>
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatQAR(inv.total_qar)}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {inv.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{inv.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
