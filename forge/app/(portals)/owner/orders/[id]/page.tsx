import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GoldLossBadge,
  OrderStatusBadge,
  StageStatusBadge,
} from "@/components/orders/status-badge";
import { StageProgress } from "@/components/orders/stage-progress";
import {
  formatCarats,
  formatDate,
  formatDateTime,
  formatGrams,
  formatQAR,
} from "@/lib/format";
import { assignWorkerAction } from "./actions";
import { Select } from "@/components/ui/select";
import type {
  Client,
  Order,
  OrderGemstone,
  OrderStage,
  ScopeItem,
  User,
} from "@/lib/types";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const o = orderRow as Order;

  const [{ data: stages }, { data: scope }, { data: gems }, { data: workers }, { data: c }] =
    await Promise.all([
      supabase
        .from("order_stages")
        .select("*")
        .eq("order_id", params.id)
        .order("stage_number", { ascending: true }),
      supabase
        .from("scope_items")
        .select("*")
        .eq("order_id", params.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("order_gemstones")
        .select("*")
        .eq("order_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "worker")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("clients")
        .select("id, full_name, company_name, email, phone")
        .eq("id", o.client_id)
        .maybeSingle(),
    ]);

  const cl = c as Pick<Client, "id" | "full_name" | "company_name" | "email" | "phone"> | null;
  const stageRows = (stages ?? []) as OrderStage[];
  const scopeRows = (scope ?? []) as ScopeItem[];
  const gemRows = (gems ?? []) as OrderGemstone[];
  const workerOptions = (workers ?? []) as Pick<User, "id" | "full_name">[];

  const ackedCount = scopeRows.filter((s) => s.client_ack).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            <Link href="/owner/orders" className="hover:underline">
              Orders
            </Link>{" "}
            / {o.order_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {o.piece_type} · {o.karat}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cl?.full_name}
            {cl?.company_name ? ` · ${cl.company_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={o.status} />
          {o.scope_locked && <Badge variant="muted">Scope locked</Badge>}
          <Link
            href={`/owner/orders/${o.id}/scope`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {o.scope_locked ? "View scope" : "Edit scope"}
          </Link>
          <Link
            href={`/owner/orders/${o.id}/stones`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Issue stones
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Piece</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Description" value={o.piece_description ?? "—"} />
            <Field label="Target weight" value={formatGrams(o.target_weight_grams ?? null)} />
            <Field label="Estimated delivery" value={formatDate(o.estimated_delivery)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Name" value={cl?.full_name ?? "—"} />
            <Field label="Email" value={cl?.email ?? "—"} />
            <Field label="Phone" value={cl?.phone ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={assignWorkerAction} className="flex flex-col gap-2">
              <input type="hidden" name="order_id" value={o.id} />
              <Select
                name="assigned_worker_id"
                defaultValue={o.assigned_worker_id ?? ""}
              >
                <option value="">Unassigned</option>
                {workerOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name}
                  </option>
                ))}
              </Select>
              <button
                type="submit"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Update
              </button>
            </form>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Reassigns this order and any unfinished stages.
            </p>
          </CardContent>
        </Card>
      </div>

      {stageRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <StageProgress stages={stageRows} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Stages</CardTitle>
          <p className="text-xs text-muted-foreground">
            {stageRows.filter((s) => s.status === "approved").length} of{" "}
            {stageRows.length} approved
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {stageRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No stages. Pick a stage template to materialise the pipeline.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Gold</th>
                  <th className="px-4 py-2">Loss</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {stageRows.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium">{s.stage_number}</td>
                    <td className="px-4 py-2">{s.stage_name}</td>
                    <td className="px-4 py-2">
                      <StageStatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {s.gold_in_grams != null
                        ? `${formatGrams(s.gold_in_grams)} → ${formatGrams(s.gold_out_grams)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {s.gold_loss_pct != null ? (
                        <span className="flex items-center gap-2">
                          <span>{s.gold_loss_pct.toFixed(2)}%</span>
                          <GoldLossBadge flag={s.gold_loss_flag} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDateTime(s.submitted_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/owner/orders/${o.id}/stages/${s.stage_number}`}
                        className="text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Scope</CardTitle>
            <p className="text-xs text-muted-foreground">
              {scopeRows.length} item{scopeRows.length === 1 ? "" : "s"}
              {o.scope_locked
                ? ` · signed ${formatDateTime(o.scope_signed_at)}`
                : scopeRows.length
                ? ` · ${ackedCount} acked`
                : ""}
            </p>
          </CardHeader>
          <CardContent>
            {scopeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Scope is empty.{" "}
                <Link
                  href={`/owner/orders/${o.id}/scope`}
                  className="text-primary underline"
                >
                  Build it
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {scopeRows.slice(0, 5).map((s) => (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Gemstones issued</CardTitle>
            <p className="text-xs text-muted-foreground">
              {gemRows.length} batch{gemRows.length === 1 ? "" : "es"}
            </p>
          </CardHeader>
          <CardContent>
            {gemRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stones issued.{" "}
                <Link
                  href={`/owner/orders/${o.id}/stones`}
                  className="text-primary underline"
                >
                  Issue stones
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {gemRows.map((g) => (
                  <li key={g.id} className="flex items-center justify-between">
                    <span className="capitalize">
                      {g.qty_pieces}× {g.stone_type}
                      {g.stone_shape ? ` · ${g.stone_shape.replace("_", " ")}` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCarats(g.total_carats)}
                      {g.estimated_value_qar != null
                        ? ` · ${formatQAR(g.estimated_value_qar)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
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

