import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge, StageStatusBadge } from "@/components/orders/status-badge";
import { StageProgress } from "@/components/orders/stage-progress";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { STORAGE } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Order, OrderStage, ScopeItem } from "@/lib/types";

export default async function ClientOrderPage({
  params,
}: {
  params: { id: string };
}) {
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

  const [{ data: stages }, { data: scope }] = await Promise.all([
    supabase
      .from("order_stages")
      .select("*")
      .eq("order_id", params.id)
      .eq("status", "approved")
      .order("stage_number", { ascending: true }),
    supabase
      .from("scope_items")
      .select("*")
      .eq("order_id", params.id)
      .order("sort_order", { ascending: true }),
  ]);

  const approvedStages = (stages ?? []) as OrderStage[];
  const scopeRows = (scope ?? []) as ScopeItem[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/client" className="hover:underline">
            My orders
          </Link>{" "}
          / {o.order_number}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {o.piece_type} · {o.karat}
          </h1>
          <OrderStatusBadge status={o.status} />
          {o.scope_locked && <Badge variant="muted">Scope signed</Badge>}
        </div>
        {o.estimated_delivery && (
          <p className="text-sm text-muted-foreground">
            Estimated delivery {formatDate(o.estimated_delivery)}
          </p>
        )}
      </div>

      {o.status === "scope_pending" && !o.scope_locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action: review &amp; sign your scope</CardTitle>
            <CardDescription>
              Your workshop has prepared the agreement. Tick every line and sign to start production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/client/orders/${o.id}/scope`}
              className={buttonVariants()}
            >
              Open scope
            </Link>
          </CardContent>
        </Card>
      )}

      {scopeRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agreed scope</CardTitle>
            <CardDescription>
              {o.scope_locked
                ? `Signed ${formatDateTime(o.scope_signed_at)} from ${o.scope_client_ip ?? "?"}.`
                : "Awaiting your signature."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {scopeRows.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 capitalize">
                    {s.category}
                  </Badge>
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-muted-foreground">{s.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            {!o.scope_locked && (
              <div className="mt-3">
                <Link
                  href={`/client/orders/${o.id}/scope`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open to sign
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {approvedStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Production progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StageProgress stages={approvedStages} />
            {approvedStages.map((s) => (
              <StageBlock key={s.id} stage={s} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StageBlock({ stage }: { stage: OrderStage }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Stage {stage.stage_number} · {stage.stage_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Approved {formatDateTime(stage.approved_at)}
          </p>
        </div>
        <StageStatusBadge status={stage.status} />
      </div>
      <PhotoGrid bucket={STORAGE.stagePhotos} paths={stage.photo_urls ?? []} />
    </div>
  );
}
