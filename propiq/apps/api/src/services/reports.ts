import type { DealStage } from "@propiq/shared";
import { withTenant } from "../db/tenant";
import { prisma } from "../db/prisma";

export type DateRange = "this_month" | "last_3_months" | "last_12_months" | "all_time";

interface RangeBound {
  /** SQL fragment evaluating the lower bound, or null for "no lower bound". */
  sinceSql: string | null;
}

/** Returns a SQL expression for the start of the date range. */
function rangeBound(range: DateRange): RangeBound {
  switch (range) {
    case "this_month":
      return { sinceSql: `date_trunc('month', NOW())` };
    case "last_3_months":
      return { sinceSql: `NOW() - INTERVAL '3 months'` };
    case "last_12_months":
      return { sinceSql: `NOW() - INTERVAL '12 months'` };
    case "all_time":
    default:
      return { sinceSql: null };
  }
}

// ── 1. Pipeline conversion funnel ────────────────────────────────────────────

const FUNNEL_STAGES: DealStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWED",
  "OFFER_MADE",
  "NEGOTIATING",
  "CONTRACT_SENT",
  "CLOSED_WON",
];

export interface FunnelRow {
  stage: DealStage;
  count: number;
  /** % of NEW_LEAD that reached this stage, 0-100. NEW_LEAD itself is 100. */
  conversion: number;
  /** % drop-off from the previous stage, 0-100. NEW_LEAD is 0. */
  dropoff: number;
}

export async function getFunnel(
  slug: string,
  range: DateRange,
): Promise<FunnelRow[]> {
  const { sinceSql } = rangeBound(range);
  // Count deals that *reached* a given stage. CLOSED_WON is the only non-active
  // funnel stage we count as "reached"; CLOSED_LOST is excluded from conversion.
  // For simplicity: a deal counts toward stage S if its current stage is at or
  // beyond S (treating CLOSED_LOST as not having reached anything past where
  // it's currently sitting — which is a simplification, but adequate without a
  // stage-history table).
  const stageOrder: Record<DealStage, number> = {
    NEW_LEAD: 1,
    CONTACTED: 2,
    VIEWING_SCHEDULED: 3,
    VIEWED: 4,
    OFFER_MADE: 5,
    NEGOTIATING: 6,
    CONTRACT_SENT: 7,
    CLOSED_WON: 8,
    CLOSED_LOST: -1,
  };

  const where = sinceSql ? `WHERE created_at >= ${sinceSql}` : "";
  const result = await withTenant(slug, (client) =>
    client.query(`SELECT stage, COUNT(*)::int AS count FROM deals ${where} GROUP BY stage`),
  );

  // Build a map of current-stage → count.
  const byStage = new Map<DealStage, number>();
  for (const r of result.rows) byStage.set(r.stage as DealStage, Number(r.count));

  // For each funnel stage, count deals whose current stage is at or beyond it
  // (excluding CLOSED_LOST entirely from the funnel).
  const reachedAt = (target: DealStage) => {
    let total = 0;
    for (const [s, c] of byStage) {
      if (s === "CLOSED_LOST") continue;
      if (stageOrder[s] >= stageOrder[target]) total += c;
    }
    return total;
  };

  const total = reachedAt("NEW_LEAD") || 0;
  const rows: FunnelRow[] = [];
  let prev = total;
  for (const stage of FUNNEL_STAGES) {
    const count = reachedAt(stage);
    const conversion = total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
    const dropoff =
      prev === 0 ? 0 : Math.round(((prev - count) / prev) * 1000) / 10;
    rows.push({ stage, count, conversion, dropoff });
    prev = count;
  }
  return rows;
}

// ── 2. Revenue by agent ──────────────────────────────────────────────────────

export interface AgentRevenueRow {
  agentId: string;
  agentName: string;
  thisMonth: number;
  lastMonth: number;
}

export async function getRevenueByAgent(
  slug: string,
  agencyId: string,
): Promise<AgentRevenueRow[]> {
  const users = await prisma.user.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });

  // Sum commissions by assigned_to for this month and last month, on CLOSED_WON deals.
  const result = await withTenant(slug, (client) =>
    client.query(`
      SELECT
        assigned_to,
        COALESCE(SUM(commission_value) FILTER (
          WHERE stage = 'CLOSED_WON'
          AND COALESCE(closed_at, updated_at) >= date_trunc('month', NOW())
        ), 0)::bigint AS this_month,
        COALESCE(SUM(commission_value) FILTER (
          WHERE stage = 'CLOSED_WON'
          AND COALESCE(closed_at, updated_at) >= date_trunc('month', NOW()) - INTERVAL '1 month'
          AND COALESCE(closed_at, updated_at) < date_trunc('month', NOW())
        ), 0)::bigint AS last_month
      FROM deals
      WHERE assigned_to IS NOT NULL
      GROUP BY assigned_to
    `),
  );
  const byAgent = new Map<string, { thisMonth: number; lastMonth: number }>();
  for (const r of result.rows) {
    byAgent.set(r.assigned_to as string, {
      thisMonth: Number(r.this_month) || 0,
      lastMonth: Number(r.last_month) || 0,
    });
  }
  return users
    .map<AgentRevenueRow>((u) => {
      const stats = byAgent.get(u.id) ?? { thisMonth: 0, lastMonth: 0 };
      return {
        agentId: u.id,
        agentName: `${u.firstName} ${u.lastName}`.trim(),
        thisMonth: stats.thisMonth,
        lastMonth: stats.lastMonth,
      };
    })
    .sort((a, b) => b.thisMonth - a.thisMonth);
}

// ── 3. Leads by source ──────────────────────────────────────────────────────

export interface LeadSourceRow {
  source: string;
  count: number;
}

const KNOWN_SOURCES = [
  "Bayut",
  "Property Finder",
  "Referral",
  "Cold Call",
  "Walk-in",
  "Website",
];

export async function getLeadsBySource(
  slug: string,
  range: DateRange,
): Promise<LeadSourceRow[]> {
  const { sinceSql } = rangeBound(range);
  const where = sinceSql
    ? `WHERE created_at >= ${sinceSql}`
    : "";
  const result = await withTenant(slug, (client) =>
    client.query(
      `SELECT source, COUNT(*)::int AS count
       FROM contacts ${where}
       GROUP BY source`,
    ),
  );

  const byKey = new Map<string, number>();
  for (const known of KNOWN_SOURCES) byKey.set(known, 0);
  let other = 0;
  for (const r of result.rows) {
    const src = r.source as string | null;
    if (!src) {
      // Bucket nulls under Walk-in by default
      byKey.set("Walk-in", (byKey.get("Walk-in") ?? 0) + Number(r.count));
      continue;
    }
    if (byKey.has(src)) {
      byKey.set(src, byKey.get(src)! + Number(r.count));
    } else {
      other += Number(r.count);
    }
  }
  const rows: LeadSourceRow[] = KNOWN_SOURCES.map((s) => ({
    source: s,
    count: byKey.get(s) ?? 0,
  }));
  if (other > 0) rows.push({ source: "Other", count: other });
  return rows;
}

// ── 4. Monthly deal volume (last 12 months) ─────────────────────────────────

export interface MonthlyVolumeRow {
  /** ISO month "YYYY-MM" */
  month: string;
  closedWon: number;
  closedLost: number;
}

export async function getMonthlyDealVolume(
  slug: string,
): Promise<MonthlyVolumeRow[]> {
  const result = await withTenant(slug, (client) =>
    client.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW() - INTERVAL '11 months'),
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS m
      )
      SELECT
        to_char(months.m, 'YYYY-MM') AS month,
        COALESCE(COUNT(d.*) FILTER (WHERE d.stage = 'CLOSED_WON'), 0)::int AS closed_won,
        COALESCE(COUNT(d.*) FILTER (WHERE d.stage = 'CLOSED_LOST'), 0)::int AS closed_lost
      FROM months
      LEFT JOIN deals d ON date_trunc('month', COALESCE(d.closed_at, d.updated_at)) = months.m
                       AND d.stage IN ('CLOSED_WON', 'CLOSED_LOST')
      GROUP BY months.m
      ORDER BY months.m
    `),
  );
  return result.rows.map((r) => ({
    month: r.month,
    closedWon: Number(r.closed_won) || 0,
    closedLost: Number(r.closed_lost) || 0,
  }));
}

// ── 5. Average days per stage ────────────────────────────────────────────────

export interface AvgDaysRow {
  stage: DealStage;
  avgDays: number;
  /** Number of deals that contributed to the average (currently sitting in this stage). */
  sample: number;
}

export async function getAvgDaysPerStage(
  slug: string,
  range: DateRange,
): Promise<AvgDaysRow[]> {
  // Without a stage-history table we approximate "days in stage" as the time
  // since the deal's last update. This understates time for stages that
  // changed pre-record but is the best we can do without history.
  const { sinceSql } = rangeBound(range);
  const where = sinceSql
    ? `AND created_at >= ${sinceSql}`
    : "";

  const result = await withTenant(slug, (client) =>
    client.query(`
      SELECT
        stage,
        AVG(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400.0)::float AS avg_days,
        COUNT(*)::int AS sample
      FROM deals
      WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST') ${where}
      GROUP BY stage
    `),
  );
  const byStage = new Map<DealStage, AvgDaysRow>();
  for (const r of result.rows) {
    byStage.set(r.stage as DealStage, {
      stage: r.stage as DealStage,
      avgDays: Math.round((Number(r.avg_days) || 0) * 10) / 10,
      sample: Number(r.sample) || 0,
    });
  }
  return FUNNEL_STAGES.filter((s) => s !== "CLOSED_WON").map(
    (stage) =>
      byStage.get(stage) ?? { stage, avgDays: 0, sample: 0 },
  );
}
