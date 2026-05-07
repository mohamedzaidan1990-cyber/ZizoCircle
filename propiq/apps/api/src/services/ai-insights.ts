import { anthropic, CLAUDE_MODEL, extractText } from "./anthropic";
import { getDashboardStats } from "./stats";
import { getPipeline } from "./deals";

export interface AiInsight {
  id: string;
  type: "OPPORTUNITY" | "RISK" | "RECOMMENDATION";
  title: string;
  body: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

const INSIGHTS_SYSTEM = `You are PropIQ's AI sales coach for real estate agencies in Qatar and the GCC.

Given a snapshot of an agency's CRM (lead counts, pipeline by stage, property inventory, activity volume), you produce 3 to 6 short, specific insights an agent or manager could act on this week.

Output ONLY valid JSON matching this exact schema:
{
  "insights": [
    {
      "type": "OPPORTUNITY" | "RISK" | "RECOMMENDATION",
      "title": "Short headline (under 60 chars).",
      "body": "1-2 sentences with specifics. Reference numbers from the snapshot.",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}

Rules:
- Reference actual numbers from the snapshot ("12 dead leads", "QAR 4.5M weighted pipeline").
- Tie each insight to a concrete action ("re-engage the 12 dead leads with hot tier", not "improve engagement").
- HIGH priority for revenue-at-risk items (stalled deals, dead leads with high tier).
- LOW priority for nice-to-haves.
- Skip generic advice. If the data is sparse (empty CRM), say so plainly in one insight.
- No preamble, no markdown, no code fences. Just the JSON object.`;

export async function generateAiInsights(
  slug: string,
): Promise<AiInsight[]> {
  const [stats, pipeline] = await Promise.all([
    getDashboardStats(slug),
    getPipeline(slug),
  ]);

  const snapshot = {
    contacts: stats.contacts,
    properties: stats.properties,
    deals: {
      total: stats.deals.total,
      open: stats.deals.open,
      won: stats.deals.won,
      lost: stats.deals.lost,
      pipelineValueQAR: stats.deals.pipelineValue,
      weightedPipelineValueQAR: stats.deals.weightedPipelineValue,
      expectedCommissionQAR: stats.deals.expectedCommission,
      byStage: pipeline.map((g) => ({
        stage: g.stage,
        count: g.count,
        totalValueQAR: g.totalValue,
      })),
    },
    activities: stats.activities,
  };

  const client = anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: INSIGHTS_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `CRM snapshot:\n\n${JSON.stringify(snapshot, null, 2)}\n\nGenerate insights for the team for this week.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: { insights?: Array<Omit<AiInsight, "id">> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [
      {
        id: "fallback-parse",
        type: "RECOMMENDATION",
        title: "AI insights temporarily unavailable",
        body: "The AI returned a non-JSON response. Try again in a moment.",
        priority: "LOW",
      },
    ];
  }
  const items = Array.isArray(parsed.insights) ? parsed.insights : [];
  return items.map((it, idx) => ({
    id: `insight-${idx}`,
    type:
      it.type === "OPPORTUNITY" || it.type === "RISK" || it.type === "RECOMMENDATION"
        ? it.type
        : "RECOMMENDATION",
    title: String(it.title ?? "").slice(0, 120),
    body: String(it.body ?? "").slice(0, 400),
    priority:
      it.priority === "HIGH" || it.priority === "MEDIUM" || it.priority === "LOW"
        ? it.priority
        : "MEDIUM",
  }));
}
