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
import { StageStatusBadge } from "@/components/orders/status-badge";
import { formatDate } from "@/lib/format";
import type { Order, OrderStage } from "@/lib/types";

type StageWithOrder = OrderStage & {
  orders: Pick<Order, "id" | "order_number" | "piece_type" | "karat"> | null;
};

export default async function WorkerHomePage() {
  const me = await requireRole("worker");
  const supabase = createClient();

  const { data } = await supabase
    .from("order_stages")
    .select("*, orders(id, order_number, piece_type, karat)")
    .eq("assigned_worker_id", me.id)
    .neq("status", "approved")
    .order("stage_number", { ascending: true });

  const rows = (data ?? []) as StageWithOrder[];

  const active = rows.filter((s) =>
    ["in_progress", "rework_requested"].includes(s.status)
  );
  const submitted = rows.filter((s) =>
    ["submitted", "rework_submitted"].includes(s.status)
  );
  const upcoming = rows.filter((s) => s.status === "not_started");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My jobs</h1>
        <p className="text-sm text-muted-foreground">
          Stages assigned to you, grouped by status.
        </p>
      </div>

      <Section
        title="Action needed"
        description="Stages you should be working on."
        rows={active}
        emptyLabel="Nothing waiting on you."
      />
      <Section
        title="Awaiting owner approval"
        description="You've submitted these — owner reviewing."
        rows={submitted}
        emptyLabel="Nothing pending review."
      />
      <Section
        title="Upcoming"
        description="Future stages on your orders."
        rows={upcoming}
        emptyLabel="No upcoming stages."
      />
    </div>
  );
}

function Section({
  title,
  description,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  rows: StageWithOrder[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="muted">{rows.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/worker/stages/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {s.orders?.order_number ?? "—"} · Stage {s.stage_number}: {s.stage_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.orders ? `${s.orders.piece_type} · ${s.orders.karat}` : ""}
                      {s.started_at ? ` · started ${formatDate(s.started_at)}` : ""}
                    </div>
                  </div>
                  <StageStatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
