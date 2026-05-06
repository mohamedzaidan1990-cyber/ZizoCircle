import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getClientForCurrentUser } from "@/lib/db/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatDateTime } from "@/lib/format";
import { toggleAckAction } from "./actions";
import { SignForm } from "./sign-form";
import type { Order, ScopeItem } from "@/lib/types";

export default async function ClientScopePage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireRole("client");
  const client = await getClientForCurrentUser();
  if (!client) notFound();

  const supabase = createClient();
  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", client.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const o = orderRow as Order;

  const { data: items } = await supabase
    .from("scope_items")
    .select("*")
    .eq("order_id", params.id)
    .order("sort_order", { ascending: true });
  const rows = (items ?? []) as ScopeItem[];

  const allAcked = rows.length > 0 && rows.every((r) => r.client_ack);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/client" className="hover:underline">
            My orders
          </Link>{" "}
          /{" "}
          <Link href={`/client/orders/${o.id}`} className="hover:underline">
            {o.order_number}
          </Link>{" "}
          / Scope
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Scope of work</h1>
          <OrderStatusBadge status={o.status} />
          {o.scope_locked && <Badge variant="muted">Signed</Badge>}
        </div>
        {o.scope_locked && (
          <p className="text-sm text-muted-foreground">
            You signed this {formatDateTime(o.scope_signed_at)} from {o.scope_client_ip ?? "?"}.
          </p>
        )}
      </div>

      {!o.scope_locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How signing works</CardTitle>
            <CardDescription>
              Read each item carefully. Tick every line you agree with — all items must be ticked
              before you can sign. Signing is final and locks the agreement.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Scope is empty.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((it) => (
                <li key={it.id} className="flex items-start gap-3 py-3 text-sm">
                  {!o.scope_locked ? (
                    <form action={toggleAckAction}>
                      <input type="hidden" name="order_id" value={o.id} />
                      <input type="hidden" name="item_id" value={it.id} />
                      <input type="hidden" name="ack" value={it.client_ack ? "false" : "true"} />
                      <button
                        type="submit"
                        aria-pressed={it.client_ack}
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                          it.client_ack
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {it.client_ack ? "✓" : ""}
                      </button>
                    </form>
                  ) : (
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        it.client_ack
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-input bg-background"
                      }`}
                    >
                      {it.client_ack ? "✓" : ""}
                    </span>
                  )}
                  <div className="flex-1">
                    <Badge variant="outline" className="mr-2 capitalize">
                      {it.category}
                    </Badge>
                    <span className="font-medium">{it.label}</span>
                    <div className="text-muted-foreground">{it.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!o.scope_locked && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign</CardTitle>
          </CardHeader>
          <CardContent>
            <SignForm orderId={o.id} expectedName={me.full_name} allAcked={allAcked} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
