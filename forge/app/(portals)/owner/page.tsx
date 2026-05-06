import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDate, formatQAR } from "@/lib/format";
import type { Order, Client } from "@/lib/types";

type OrderWithClient = Order & { clients: Pick<Client, "full_name"> | null };

type StageRow = { id: string; order_id: string; stage_name: string; status: string; orders: { order_number: string } | null };

export default async function OwnerDashboard() {
  const supabase = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: orders },
    { count: activeOrders },
    { count: overdueInvoices },
    { data: pendingStages },
    { data: goldRows },
    { data: revenueRows },
  ] = await Promise.all([
    // 10 most-recent orders for the table
    supabase
      .from("orders")
      .select("*, clients(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),

    // Active order count (not completed or cancelled)
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(completed,cancelled)"),

    // Overdue invoices
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue"),

    // Stages awaiting owner review
    supabase
      .from("order_stages")
      .select("id, order_id, stage_name, status, orders(order_number)")
      .in("status", ["submitted", "rework_submitted"])
      .order("submitted_at", { ascending: true })
      .limit(10),

    // Gold out this calendar month (sum of gold_out_grams from approved stages)
    supabase
      .from("order_stages")
      .select("gold_out_grams")
      .eq("status", "approved")
      .gte("approved_at", monthStart),

    // Revenue MTD: credit entries in accounting_ledger this month
    supabase
      .from("accounting_ledger")
      .select("amount_qar")
      .eq("is_credit", true)
      .gte("txn_date", monthStart.slice(0, 10)),
  ]);

  const recent = (orders ?? []) as OrderWithClient[];
  const pending = (pendingStages ?? []) as StageRow[];

  const goldOutMtd = (goldRows ?? []).reduce(
    (sum, r) => sum + (Number((r as { gold_out_grams: number | null }).gold_out_grams) || 0),
    0
  );
  const revenueMtd = (revenueRows ?? []).reduce(
    (sum, r) => sum + (Number((r as { amount_qar: number }).amount_qar) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleString("en-GB", { month: "long", year: "numeric" })} at a glance.
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

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active orders" value={activeOrders ?? 0} />
        <StatCard label="Pending approvals" value={pending.length} />
        <StatCard
          label="Revenue MTD"
          value={formatQAR(revenueMtd)}
          numeric={false}
        />
        <StatCard
          label="Gold out MTD (g)"
          value={goldOutMtd.toFixed(2)}
          numeric={false}
          warning={(overdueInvoices ?? 0) > 0}
          warningLabel={`${overdueInvoices} overdue invoice${(overdueInvoices ?? 0) === 1 ? "" : "s"}`}
        />
      </div>

      {/* Pending stage approvals */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting your review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium">
                      {s.orders?.order_number ?? "—"}
                    </td>
                    <td className="px-4 py-2">{s.stage_name}</td>
                    <td className="px-4 py-2">
                      <Badge variant={s.status === "rework_submitted" ? "warning" : "muted"}>
                        {s.status === "rework_submitted" ? "Rework" : "Submitted"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/owner/orders/${s.order_id}/stages`}
                        className="text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Overdue invoices alert */}
      {(overdueInvoices ?? 0) > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {overdueInvoices} overdue invoice{(overdueInvoices ?? 0) === 1 ? "" : "s"} —{" "}
          <Link href="/owner/invoices?status=overdue" className="font-medium underline">
            view all
          </Link>
        </div>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent className={recent.length === 0 ? undefined : "p-0"}>
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
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Piece</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-medium">{o.order_number}</td>
                    <td className="px-4 py-2">{o.clients?.full_name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {o.piece_type} · {o.karat}
                    </td>
                    <td className="px-4 py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
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

function StatCard({
  label,
  value,
  numeric = true,
  warning = false,
  warningLabel,
}: {
  label: string;
  value: number | string;
  numeric?: boolean;
  warning?: boolean;
  warningLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">
          {numeric ? value.toLocaleString() : value}
        </p>
        {warning && warningLabel && (
          <p className="mt-1 text-xs text-destructive">{warningLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
