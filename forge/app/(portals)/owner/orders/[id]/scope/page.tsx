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
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDateTime } from "@/lib/format";
import { AddScopeItemForm } from "./add-item-form";
import { deleteScopeItemAction, sendScopeAction } from "./actions";
import type { Order, ScopeItem } from "@/lib/types";

export default async function ScopePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const o = orderRow as Order;

  const { data: items } = await supabase
    .from("scope_items")
    .select("*")
    .eq("order_id", params.id)
    .order("sort_order", { ascending: true });
  const rows = (items ?? []) as ScopeItem[];

  const locked = o.scope_locked;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/owner/orders" className="hover:underline">
            Orders
          </Link>{" "}
          /{" "}
          <Link href={`/owner/orders/${o.id}`} className="hover:underline">
            {o.order_number}
          </Link>{" "}
          / Scope
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Scope of work</h1>
          <OrderStatusBadge status={o.status} />
          {locked && <Badge variant="muted">Locked</Badge>}
          <a
            href={`/owner/orders/${o.id}/scope/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-primary hover:underline"
          >
            Download PDF ↗
          </a>
        </div>
        {locked && (
          <p className="mt-1 text-sm text-muted-foreground">
            Signed by client {formatDateTime(o.scope_signed_at)} from {o.scope_client_ip ?? "?"}.
            No further edits.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items ({rows.length})</CardTitle>
          <CardDescription>
            Each line is a binding agreement point. The client must tick every item before
            signing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rows.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-3 py-3 text-sm">
                  <Badge variant="outline" className="mt-0.5 capitalize">
                    {it.category}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{it.label}</div>
                    <div className="text-muted-foreground">{it.detail}</div>
                  </div>
                  {it.client_ack && <Badge variant="success">Acked</Badge>}
                  {!locked && (
                    <form action={deleteScopeItemAction}>
                      <input type="hidden" name="order_id" value={o.id} />
                      <input type="hidden" name="item_id" value={it.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add item</CardTitle>
          </CardHeader>
          <CardContent>
            <AddScopeItemForm orderId={o.id} />
          </CardContent>
        </Card>
      )}

      {!locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send to client</CardTitle>
            <CardDescription>
              Marks the order as <code>scope_pending</code>. The client signs in their portal,
              which locks the scope and timestamps it (with their IP).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendScopeAction} className="flex items-center gap-3">
              <input type="hidden" name="order_id" value={o.id} />
              <button
                type="submit"
                className={buttonVariants()}
                disabled={rows.length === 0}
              >
                Send scope to client
              </button>
              {searchParams.error === "empty" && (
                <p className="text-sm text-destructive">Add at least one item first.</p>
              )}
              {o.status === "scope_pending" && (
                <p className="text-sm text-muted-foreground">
                  Awaiting client signature.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
