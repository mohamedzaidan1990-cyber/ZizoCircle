import type { DealStage } from "@propiq/shared";
import { withTenant } from "../db/tenant";

export interface DashboardStats {
  contacts: {
    total: number;
    active: number;
    dead: number;
    hot: number;
    warm: number;
    cold: number;
    salesLeads: number;
    leaseLeads: number;
  };
  properties: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    rented: number;
  };
  deals: {
    total: number;
    open: number;
    won: number;
    lost: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    expectedCommission: number;
    byStage: Record<DealStage, { count: number; value: number }>;
  };
  activities: {
    last30Days: number;
    upcoming: number;
  };
}

const ALL_STAGES: DealStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWED",
  "OFFER_MADE",
  "NEGOTIATING",
  "CONTRACT_SENT",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export async function getDashboardStats(slug: string): Promise<DashboardStats> {
  return withTenant(slug, async (client) => {
    // Sequential — pg client doesn't allow concurrent queries on a single connection.
    const contactsRes = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_archived = false)::int AS active_or_dead,
          COUNT(*) FILTER (WHERE ai_score >= 80)::int AS hot,
          COUNT(*) FILTER (WHERE ai_score BETWEEN 50 AND 79)::int AS warm,
          COUNT(*) FILTER (WHERE ai_score < 50)::int AS cold,
          COUNT(*) FILTER (WHERE pipeline_type = 'SALES')::int AS sales_leads,
          COUNT(*) FILTER (WHERE pipeline_type = 'LEASE')::int AS lease_leads,
          COUNT(*) FILTER (
            WHERE is_archived = false AND (
              created_at > NOW() - INTERVAL '30 days'
              OR id IN (SELECT contact_id FROM activities
                        WHERE contact_id IS NOT NULL
                        AND COALESCE(completed_at, created_at) > NOW() - INTERVAL '30 days')
            )
          )::int AS active,
          COUNT(*) FILTER (
            WHERE is_archived = false
              AND created_at <= NOW() - INTERVAL '30 days'
              AND id NOT IN (SELECT contact_id FROM activities
                             WHERE contact_id IS NOT NULL
                             AND COALESCE(completed_at, created_at) > NOW() - INTERVAL '30 days')
          )::int AS dead
        FROM contacts
      `);
    const propsRes = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
          COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
          COUNT(*) FILTER (WHERE status = 'SOLD')::int AS sold,
          COUNT(*) FILTER (WHERE status = 'RENTED')::int AS rented
        FROM properties
      `);
    const dealsRes = await client.query(`
        SELECT
          stage,
          COUNT(*)::int AS count,
          COALESCE(SUM(value), 0)::bigint AS total_value,
          COALESCE(SUM(value * probability), 0)::bigint AS weighted_value,
          COALESCE(SUM(commission_value), 0)::bigint AS commission_value
        FROM deals
        GROUP BY stage
      `);
    const actsRes = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(completed_at, created_at) > NOW() - INTERVAL '30 days')::int AS recent,
          COUNT(*) FILTER (WHERE scheduled_at IS NOT NULL AND scheduled_at >= NOW())::int AS upcoming
        FROM activities
      `);

    const cRow = contactsRes.rows[0] ?? {};
    const pRow = propsRes.rows[0] ?? {};
    const aRow = actsRes.rows[0] ?? {};

    const byStage = ALL_STAGES.reduce(
      (acc, s) => {
        acc[s] = { count: 0, value: 0 };
        return acc;
      },
      {} as DashboardStats["deals"]["byStage"],
    );

    let dealsTotal = 0;
    let dealsOpen = 0;
    let dealsWon = 0;
    let dealsLost = 0;
    let pipelineValue = 0;
    let weightedPipelineValue = 0;
    let expectedCommission = 0;

    for (const row of dealsRes.rows) {
      const stage = row.stage as DealStage;
      const count = Number(row.count) || 0;
      const value = Number(row.total_value) || 0;
      const weighted = (Number(row.weighted_value) || 0) / 100; // probability is 0-100
      const commission = Number(row.commission_value) || 0;

      if (byStage[stage]) {
        byStage[stage] = { count, value };
      }
      dealsTotal += count;
      if (stage === "CLOSED_WON") {
        dealsWon += count;
        expectedCommission += commission;
      } else if (stage === "CLOSED_LOST") {
        dealsLost += count;
      } else {
        dealsOpen += count;
        pipelineValue += value;
        weightedPipelineValue += weighted;
      }
    }

    return {
      contacts: {
        total: Number(cRow.total) || 0,
        active: Number(cRow.active) || 0,
        dead: Number(cRow.dead) || 0,
        hot: Number(cRow.hot) || 0,
        warm: Number(cRow.warm) || 0,
        cold: Number(cRow.cold) || 0,
        salesLeads: Number(cRow.sales_leads) || 0,
        leaseLeads: Number(cRow.lease_leads) || 0,
      },
      properties: {
        total: Number(pRow.total) || 0,
        available: Number(pRow.available) || 0,
        reserved: Number(pRow.reserved) || 0,
        sold: Number(pRow.sold) || 0,
        rented: Number(pRow.rented) || 0,
      },
      deals: {
        total: dealsTotal,
        open: dealsOpen,
        won: dealsWon,
        lost: dealsLost,
        pipelineValue,
        weightedPipelineValue: Math.round(weightedPipelineValue),
        expectedCommission,
        byStage,
      },
      activities: {
        last30Days: Number(aRow.recent) || 0,
        upcoming: Number(aRow.upcoming) || 0,
      },
    };
  });
}
