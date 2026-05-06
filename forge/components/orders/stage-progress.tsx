import { cn } from "@/lib/utils";
import type { OrderStage } from "@/lib/types";

export function StageProgress({ stages }: { stages: OrderStage[] }) {
  const ordered = [...stages].sort((a, b) => a.stage_number - b.stage_number);
  return (
    <ol className="flex w-full items-center gap-2">
      {ordered.map((s) => {
        const tone =
          s.status === "approved"
            ? "bg-emerald-500"
            : s.status === "submitted" || s.status === "rework_submitted"
            ? "bg-amber-500"
            : s.status === "rework_requested"
            ? "bg-red-500"
            : s.status === "in_progress"
            ? "bg-primary"
            : "bg-muted";
        return (
          <li key={s.id} className="flex flex-1 flex-col gap-1">
            <div className={cn("h-1.5 w-full rounded-full", tone)} />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{s.stage_number}.</span>
              <span className="truncate">{s.stage_name}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
