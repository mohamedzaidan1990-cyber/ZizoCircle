"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { Deal, DealStage, PipelineType } from "@propiq/shared";
import { api, getErrorMessage, unwrap } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { DealSlideOver } from "./DealSlideOver";
import { NewDealDialog } from "./NewDealDialog";

const ACTIVE_STAGES: DealStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWED",
  "OFFER_MADE",
  "NEGOTIATING",
  "CONTRACT_SENT",
];

interface StageGroup {
  stage: DealStage;
  deals: Deal[];
  count: number;
  totalValue: number;
}

interface Props {
  locale: string;
}

export function PipelineBoard({ locale }: Props) {
  const t = useTranslations("pipeline");
  const tCommon = useTranslations("common");
  const [pipelineType, setPipelineType] = useState<PipelineType | "ALL">("ALL");
  const [groups, setGroups] = useState<StageGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get("/api/deals/pipeline", {
        params:
          pipelineType !== "ALL" ? { pipelineType } : undefined,
      });
      setGroups(unwrap<StageGroup[]>(res));
    } catch (err) {
      setError(getErrorMessage(err));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineType]);

  const dealById = useMemo(() => {
    const map = new Map<string, Deal>();
    (groups ?? []).forEach((g) => g.deals.forEach((d) => map.set(d.id, d)));
    return map;
  }, [groups]);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveDeal(dealById.get(id) ?? null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDeal(null);
    const dealId = String(e.active.id);
    const overStage = e.over?.id ? (String(e.over.id) as DealStage) : null;
    if (!overStage) return;
    const deal = dealById.get(dealId);
    if (!deal || deal.stage === overStage) return;

    // Optimistic update
    setGroups((prev) =>
      prev
        ? prev.map((g) => {
            if (g.stage === deal.stage) {
              const remaining = g.deals.filter((d) => d.id !== dealId);
              return {
                ...g,
                deals: remaining,
                count: remaining.length,
                totalValue: remaining.reduce(
                  (s, d) => s + (d.value ?? 0),
                  0,
                ),
              };
            }
            if (g.stage === overStage) {
              const next = [{ ...deal, stage: overStage }, ...g.deals];
              return {
                ...g,
                deals: next,
                count: next.length,
                totalValue: next.reduce((s, d) => s + (d.value ?? 0), 0),
              };
            }
            return g;
          })
        : prev,
    );

    try {
      await api.patch(`/api/deals/${dealId}/stage`, { stage: overStage });
    } catch (err) {
      setError(getErrorMessage(err));
      load(); // resync on failure
    }
  };

  const fmtCurrency = (n: number, currency = "QAR") =>
    `${currency} ${(n / 1000).toFixed(n >= 1_000_000 ? 1 : 0)}${
      n >= 1_000_000 ? "M" : "K"
    }`;

  const PIPELINE_TABS: { id: PipelineType | "ALL"; label: string }[] = [
    { id: "ALL", label: t("all") },
    { id: "SALES", label: t("sales") },
    { id: "LEASE", label: t("lease") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="card flex gap-1 p-1">
          {PIPELINE_TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setPipelineType(tb.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pipelineType === tb.id
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="btn-primary inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          {t("newDeal")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center">
          <Spinner />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max gap-3">
              {ACTIVE_STAGES.map((stage) => {
                const group =
                  groups?.find((g) => g.stage === stage) ?? {
                    stage,
                    deals: [],
                    count: 0,
                    totalValue: 0,
                  };
                return (
                  <Column
                    key={stage}
                    locale={locale}
                    stage={stage}
                    title={t(`stage_${stage}`)}
                    count={group.count}
                    totalValue={group.totalValue}
                    deals={group.deals}
                    onCardClick={(id) => setOpenDealId(id)}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeDeal && (
              <DealCard
                deal={activeDeal}
                fmtCurrency={fmtCurrency}
                dragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <DealSlideOver
        dealId={openDealId}
        onClose={() => setOpenDealId(null)}
        onChanged={() => {
          setOpenDealId(null);
          load();
        }}
      />

      <NewDealDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}

function Column({
  locale,
  stage,
  title,
  count,
  totalValue,
  deals,
  onCardClick,
}: {
  locale: string;
  stage: DealStage;
  title: string;
  count: number;
  totalValue: number;
  deals: Deal[];
  onCardClick: (id: string) => void;
}) {
  const t = useTranslations("pipeline");
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const fmtCurrency = (n: number, currency = "QAR") =>
    n === 0 ? "—" : `${currency} ${n.toLocaleString()}`;
  return (
    <div
      ref={setNodeRef}
      className={`card flex w-72 flex-col gap-2 p-3 transition-colors ${
        isOver ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500">
          {t("stageCount", { count })}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {t("totalValue", {
          value:
            deals.reduce((s, d) => s + (d.value ?? 0), 0) === 0
              ? "—"
              : fmtCurrency(totalValue),
        })}
      </p>
      <div className="space-y-2 min-h-[40px]">
        {deals.map((d) => (
          <DraggableDeal
            key={d.id}
            deal={d}
            onClick={() => onCardClick(d.id)}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableDeal({
  deal,
  onClick,
  locale,
}: {
  deal: Deal;
  onClick: () => void;
  locale: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1 }}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
    >
      <DealCard
        deal={deal}
        fmtCurrency={(n, c = "QAR") =>
          n === 0 ? "—" : `${c} ${n.toLocaleString()}`
        }
        locale={locale}
      />
    </div>
  );
}

function DealCard({
  deal,
  fmtCurrency,
  dragging,
  locale: _locale,
}: {
  deal: Deal;
  fmtCurrency: (n: number, c?: string) => string;
  dragging?: boolean;
  locale?: string;
}) {
  return (
    <div
      className={`rounded-md border p-3 text-sm shadow-sm transition ${
        dragging
          ? "bg-white shadow-lg"
          : "border-slate-200 bg-white hover:border-brand"
      }`}
    >
      <p className="font-medium text-slate-900 line-clamp-2">{deal.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        {deal.value ? fmtCurrency(deal.value, deal.currency) : "—"}
        {" · "}
        {deal.probability}%
      </p>
      {deal.expectedClose && (
        <p className="mt-1 text-xs text-slate-400">
          → {new Date(deal.expectedClose).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
