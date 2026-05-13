import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { STORAGE } from "@/lib/storage";
import {
  GoldLossBadge,
  StageStatusBadge,
} from "@/components/orders/status-badge";
import { formatDateTime, formatGrams } from "@/lib/format";
import { ApproveForm, ReworkForm } from "./review-form";
import type { Order, OrderGemstone, OrderStage, StageGemstoneLog } from "@/lib/types";

export default async function OwnerStageReviewPage({
  params,
}: {
  params: { id: string; stageNumber: string };
}) {
  const supabase = createClient();
  const stageNumber = Number(params.stageNumber);

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const o = orderRow as Order;

  const { data: stageRow } = await supabase
    .from("order_stages")
    .select("*")
    .eq("order_id", params.id)
    .eq("stage_number", stageNumber)
    .maybeSingle();
  if (!stageRow) notFound();
  const stage = stageRow as OrderStage;

  const [{ data: logs }, { data: gems }] = await Promise.all([
    supabase
      .from("stage_gemstone_logs")
      .select("*")
      .eq("stage_id", stage.id),
    supabase
      .from("order_gemstones")
      .select("id, stone_type, qty_pieces")
      .eq("order_id", params.id),
  ]);
  const logRows = (logs ?? []) as StageGemstoneLog[];
  const gemRows = (gems ?? []) as Pick<OrderGemstone, "id" | "stone_type" | "qty_pieces">[];

  const canDecide =
    stage.status === "submitted" || stage.status === "rework_submitted";
  const hasDiscrepancy = logRows.some((l) => l.discrepancy_flag);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/owner/orders" className="hover:underline">
            Orders
          </Link>{" "}
          /{" "}
          <Link href={`/owner/orders/${o.id}`} className="hover:underline">
            {o.order_number}
          </Link>{" "}
          / Stage {stage.stage_number}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{stage.stage_name}</h1>
          <StageStatusBadge status={stage.status} />
          {hasDiscrepancy && <Badge variant="danger">Stone discrepancy</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Issued (in)" value={formatGrams(stage.gold_in_grams)} />
            <Field label="Returned (out)" value={formatGrams(stage.gold_out_grams)} />
            <Field
              label="Loss"
              value={
                stage.gold_loss_pct != null ? (
                  <span className="flex items-center gap-2">
                    <span>{stage.gold_loss_pct.toFixed(2)}%</span>
                    <GoldLossBadge flag={stage.gold_loss_flag} />
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Started" value={formatDateTime(stage.started_at)} />
            <Field label="Submitted" value={formatDateTime(stage.submitted_at)} />
            <Field label="Approved" value={formatDateTime(stage.approved_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Worker</p>
              <p className="whitespace-pre-wrap">{stage.worker_notes ?? "—"}</p>
            </div>
            {stage.rework_reason && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Last rework reason</p>
                <p className="whitespace-pre-wrap">{stage.rework_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {logRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stone reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2">Batch</th>
                  <th className="pb-2">Issued</th>
                  <th className="pb-2">In piece</th>
                  <th className="pb-2">Loose</th>
                  <th className="pb-2">Returned</th>
                  <th className="pb-2">Damaged</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logRows.map((l) => {
                  const gem = gemRows.find((g) => g.id === l.gem_id);
                  const total =
                    l.qty_in_piece + l.qty_remaining_loose + l.qty_returned + l.qty_damaged;
                  return (
                    <tr key={l.id}>
                      <td className="py-2 capitalize">{gem?.stone_type ?? "—"}</td>
                      <td className="py-2">{gem?.qty_pieces ?? "—"}</td>
                      <td className="py-2">{l.qty_in_piece}</td>
                      <td className="py-2">{l.qty_remaining_loose}</td>
                      <td className="py-2">{l.qty_returned}</td>
                      <td className="py-2">{l.qty_damaged}</td>
                      <td className="py-2">
                        {l.discrepancy_flag ? (
                          <Badge variant="danger">
                            Off by {(gem?.qty_pieces ?? 0) - total}
                          </Badge>
                        ) : (
                          <Badge variant="success">Reconciled</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGrid
            bucket={STORAGE.stagePhotos}
            paths={stage.photo_urls ?? []}
            emptyLabel="Worker has not uploaded any photos."
          />
        </CardContent>
      </Card>

      {canDecide ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Approve</CardTitle>
            </CardHeader>
            <CardContent>
              <ApproveForm orderId={o.id} stageNumber={stage.stage_number} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Send back for rework</CardTitle>
            </CardHeader>
            <CardContent>
              <ReworkForm orderId={o.id} stageNumber={stage.stage_number} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This stage is <code>{stage.status}</code>. Approval is only available when a worker has
          submitted.
        </p>
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
