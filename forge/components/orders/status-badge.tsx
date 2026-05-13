import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { GoldLossFlag, OrderStatus, StageStatus } from "@/lib/types";

const orderVariant: Record<OrderStatus, "default" | "muted" | "warning" | "success" | "danger"> = {
  draft: "muted",
  scope_pending: "warning",
  scope_signed: "default",
  in_production: "default",
  quality_check: "warning",
  completed: "success",
  cancelled: "danger",
};

const stageVariant: Record<StageStatus, "default" | "muted" | "warning" | "success" | "danger"> = {
  not_started: "muted",
  in_progress: "default",
  submitted: "warning",
  approved: "success",
  rework_requested: "danger",
  rework_submitted: "warning",
};

const goldLossVariant: Record<GoldLossFlag, "success" | "warning" | "danger" | "default"> = {
  normal: "success",
  monitor: "warning",
  high: "danger",
  critical: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderVariant[status]}>{statusLabel(status)}</Badge>;
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <Badge variant={stageVariant[status]}>{statusLabel(status)}</Badge>;
}

export function GoldLossBadge({ flag }: { flag: GoldLossFlag | null }) {
  if (!flag) return null;
  return <Badge variant={goldLossVariant[flag]}>{statusLabel(flag)}</Badge>;
}
