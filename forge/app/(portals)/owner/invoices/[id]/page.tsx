import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cancelInvoiceAction } from "./actions";
import {
  BalanceForm,
  DepositForm,
  SendInvoiceForm,
} from "./payment-forms";
import type {
  Client,
  Invoice,
  InvoiceLineItem,
  Order,
} from "@/lib/types";

type LedgerEntry = {
  id: string;
  txn_date: string;
  txn_type: string;
  description: string;
  amount_qar: number;
  is_credit: boolean;
  notes: string | null;
};

const variantFor = (status: Invoice["status"]) =>
  status === "paid"
    ? "success"
    : status === "overdue" || status === "cancelled"
    ? "danger"
    : status === "partially_paid" || status === "sent"
    ? "warning"
    : "muted";

export default async function OwnerInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();

  const { data: invRow } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!invRow) notFound();
  const inv = invRow as Invoice;

  const [{ data: order }, { data: client }, { data: ledger }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, piece_type, karat")
        .eq("id", inv.order_id)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, full_name, company_name, email, phone")
        .eq("id", inv.client_id)
        .maybeSingle(),
      supabase
        .from("accounting_ledger")
        .select("id, txn_date, txn_type, description, amount_qar, is_credit, notes")
        .eq("reference_id", inv.id)
        .eq("reference_type", "invoice")
        .order("txn_date", { ascending: false }),
    ]);

  const o = order as Pick<Order, "id" | "order_number" | "piece_type" | "karat"> | null;
  const cl = client as Pick<
    Client,
    "id" | "full_name" | "company_name" | "email" | "phone"
  > | null;
  const ledgerRows = (ledger ?? []) as LedgerEntry[];

  const lineItems = (Array.isArray(inv.line_items)
    ? (inv.line_items as InvoiceLineItem[])
    : []) as InvoiceLineItem[];

  const depositDue =
    inv.deposit_amount_qar > 0 && !inv.deposit_paid_at;
  const balanceDue =
    inv.balance_due_qar > 0 && !inv.balance_paid_at;

  const canSend = inv.status === "draft";
  const canRecordDeposit =
    depositDue && inv.status !== "draft" && inv.status !== "cancelled";
  const canRecordBalance =
    balanceDue &&
    inv.status !== "draft" &&
    inv.status !== "cancelled" &&
    (inv.deposit_amount_qar === 0 || inv.deposit_paid_at != null);
  const canCancel =
    inv.status !== "cancelled" && inv.status !== "paid" && !inv.deposit_paid_at;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            <Link href="/owner/invoices" className="hover:underline">
              Invoices
            </Link>{" "}
            / {inv.invoice_number}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{inv.invoice_number}</h1>
            <Badge variant={variantFor(inv.status)}>{statusLabel(inv.status)}</Badge>
          </div>
          {o && (
            <p className="text-sm text-muted-foreground">
              <Link href={`/owner/orders/${o.id}`} className="hover:underline">
                {o.order_number}
              </Link>{" "}
              · {o.piece_type} · {o.karat}
            </p>
          )}
        </div>
      </div>

      {searchParams.error === "already-paid" && (
        <p className="text-sm text-destructive">
          Cannot cancel: a payment has already been recorded.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bill to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Client" value={cl?.full_name ?? "—"} />
            <Field label="Company" value={cl?.company_name ?? "—"} />
            <Field label="Email" value={cl?.email ?? "—"} />
            <Field label="Phone" value={cl?.phone ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Totals</CardTitle>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field
              label={`Deposit (${Number(inv.deposit_pct).toFixed(0)}%)`}
              value={
                <span>
                  {formatQAR(inv.deposit_amount_qar)}{" "}
                  {inv.deposit_paid_at ? (
                    <Badge variant="success">Paid</Badge>
                  ) : inv.deposit_amount_qar > 0 ? (
                    <Badge variant="warning">Due</Badge>
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
                    <Badge variant="success">Paid</Badge>
                  ) : inv.balance_due_qar > 0 ? (
                    <Badge variant="warning">Due</Badge>
                  ) : null}
                </span>
              }
            />
            <Field label="Due date" value={formatDate(inv.due_date)} />
            <Field label="Sent" value={formatDateTime(inv.sent_at)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Line items</CardTitle>
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

      {(canSend || canRecordDeposit || canRecordBalance) && (
        <div className="grid gap-4 md:grid-cols-2">
          {canSend && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Send</CardTitle>
                <CardDescription>
                  Marks the invoice as sent and emails the client (if Resend is configured).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SendInvoiceForm invoiceId={inv.id} />
              </CardContent>
            </Card>
          )}
          {canRecordDeposit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Record deposit</CardTitle>
                <CardDescription>
                  Logs an accounting entry of {formatQAR(inv.deposit_amount_qar)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DepositForm invoiceId={inv.id} />
              </CardContent>
            </Card>
          )}
          {canRecordBalance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Record balance</CardTitle>
                <CardDescription>
                  Logs an accounting entry of {formatQAR(inv.balance_due_qar)} and marks the
                  invoice paid.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BalanceForm invoiceId={inv.id} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ledger entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledgerRows.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No ledger entries yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledgerRows.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(l.txn_date)}
                    </td>
                    <td className="px-4 py-2">{statusLabel(l.txn_type)}</td>
                    <td className="px-4 py-2">{l.description}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      <span className={l.is_credit ? "text-emerald-700" : "text-destructive"}>
                        {l.is_credit ? "+" : "−"}
                        {formatQAR(l.amount_qar)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{l.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {canCancel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Danger zone</CardTitle>
            <CardDescription>
              Cancel this invoice. Only allowed before any payment is recorded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={cancelInvoiceAction}>
              <input type="hidden" name="invoice_id" value={inv.id} />
              <button
                type="submit"
                className="text-sm text-destructive hover:underline"
              >
                Cancel invoice
              </button>
            </form>
          </CardContent>
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
