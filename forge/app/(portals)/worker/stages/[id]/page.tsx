import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { STORAGE } from "@/lib/storage";
import {
  GoldLossBadge,
  StageStatusBadge,
} from "@/components/orders/status-badge";
import { startStageAction } from "./actions";
import { PhotoUpload } from "./photo-upload";
import { StoneLogForm } from "./stone-log-form";
import { SubmitStageForm } from "./submit-form";
import type {
  Order,
  OrderGemstone,
  OrderStage,
  StageGemstoneLog,
} from "@/lib/types";

export default async function WorkerStagePage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireRole("worker");
  const supabase = createClient();

  const { data: stageRow } = await supabase
    .from("order_stages")
    .select("*")
    .eq("id", params.id)
    .eq("assigned_worker_id", me.id)
    .maybeSingle();
  if (!stageRow) notFound();
  const stage = stageRow as OrderStage;

  const [{ data: order }, { data: gems }, { data: logs }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, piece_type, karat, target_weight_grams")
      .eq("id", stage.order_id)
      .maybeSingle(),
    supabase
      .from("order_gemstones")
      .select("id, stone_type, qty_pieces, stone_shape, issue_photo_url")
      .eq("order_id", stage.order_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("stage_gemstone_logs")
      .select("*")
      .eq("stage_id", stage.id),
  ]);

  const o = order as Pick<
    Order,
    "id" | "order_number" | "piece_type" | "karat" | "target_weight_grams"
  > | null;
  const gemRows = (gems ?? []) as (Pick<
    OrderGemstone,
    "id" | "stone_type" | "qty_pieces" | "stone_shape"
  > & { issue_photo_url: string })[];
  const logRows = (logs ?? []) as StageGemstoneLog[];

  const hasPhotos = (stage.photo_urls ?? []).length > 0;
  const hasDiscrepancy = logRows.some((l) => l.discrepancy_flag);
  const editable = stage.status !== "approved" && stage.status !== "submitted" && stage.status !== "rework_submitted";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          <Link href="/worker" className="hover:underline">
            My jobs
          </Link>{" "}
          / {o?.order_number ?? "—"} · Stage {stage.stage_number}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{stage.stage_name}</h1>
          <StageStatusBadge status={stage.status} />
          {hasDiscrepancy && <Badge variant="danger">Stone discrepancy</Badge>}
          {stage.gold_loss_flag && (
            <GoldLossBadge flag={stage.gold_loss_flag} />
          )}
        </div>
        {o && (
          <p className="mt-1 text-sm text-muted-foreground">
            {o.piece_type} · {o.karat}
            {o.target_weight_grams != null
              ? ` · target ${o.target_weight_grams}g`
              : ""}
          </p>
        )}
      </div>

      {stage.rework_reason && stage.status === "rework_requested" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-destructive">
              Rework requested
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {stage.rework_reason}
          </CardContent>
        </Card>
      )}

      {stage.status === "not_started" && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm">Ready to begin?</p>
            <form action={startStageAction}>
              <input type="hidden" name="stage_id" value={stage.id} />
              <button type="submit" className={buttonVariants()}>
                Start stage
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Photos ({(stage.photo_urls ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoGrid
            bucket={STORAGE.stagePhotos}
            paths={stage.photo_urls ?? []}
            emptyLabel="No photos uploaded yet."
          />
          {editable && <PhotoUpload stageId={stage.id} />}
        </CardContent>
      </Card>

      {gemRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stone reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Counts must add up to issued: <code>in piece + loose + returned + damaged = issued</code>.
              Submission is blocked while any batch is off.
            </p>
            {gemRows.map((g) => (
              <StoneLogForm
                key={g.id}
                stageId={stage.id}
                gem={g}
                existing={logRows.find((l) => l.gem_id === g.id) ?? null}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Submit</CardTitle>
        </CardHeader>
        <CardContent>
          {editable ? (
            <SubmitStageForm
              stage={stage}
              hasPhotos={hasPhotos}
              hasDiscrepancy={hasDiscrepancy}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Stage is <code>{stage.status}</code>. Wait for the owner to review.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
