import { z } from "zod";
import type { Contact, LeadScoreResult, LeadTier } from "@propiq/shared";
import { anthropic, CLAUDE_MODEL, extractText } from "../anthropic";
import { getContact } from "../contacts";
import { withTenant } from "../../db/tenant";
import { Errors } from "../../lib/errors";

const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const SYSTEM = `You are a sales operations expert for a real-estate agency in Qatar. You score buyer/tenant leads on quality from 0 to 100.

You receive a contact's profile, recent activity, AND a set of deterministic "priors" already computed from the data (budget completeness, area specificity, activity recency, open-deal presence, timeline signal, sentiment signal). Use these priors as a baseline — your job is to interpret context the priors can't see (notes content, conversation summary, source quality) and adjust accordingly. Don't ignore the priors; don't blindly average to them either.

Return ONE JSON object:

{
  "score": <integer 0-100>,
  "tier": "HOT" | "WARM" | "COLD",
  "reason": "1-2 sentences citing specific signals from the input. No generic phrasing.",
  "recommendedAction": "1 specific next step the agent can take this week.",
  "redFlags": ["Up to 4 short concrete concerns. Empty array if none."]
}

Tier mapping:
- HOT (80-100): clear budget AND defined criteria AND recent activity OR repeat engagement.
- WARM (50-79): some criteria defined OR some engagement, but missing one major signal.
- COLD (0-49): vague, no budget, no recent activity, OR red flags.

Strong signals to weigh:
+ Concrete budget range that aligns with stated property type and area
+ Specific area preferences (named neighborhoods)
+ Multiple logged activities or notes
+ Stated timeline (e.g. "ready to view this month", "moving in Q3")
+ Reasonable bedroom range matching contact type
+ Source from a paid channel ("portal lead", "referral")

Red-flag signals:
- No phone OR invalid phone
- Wildly mismatched criteria (budget too low for area)
- Long gap since last activity (>30 days)
- Vague preferences across multiple fields
- "Just looking" or window-shopping language in notes

Output ONLY the JSON object. No markdown, no preamble.`;

// ── Deterministic priors ────────────────────────────────────────────────────

interface Priors {
  budgetCompleteness: number; // 0..1
  areaSpecificity: number; // 0..1
  activityRecency: number; // 0..1
  hasOpenDeal: 0 | 1;
  timelineSignal: number; // 0..1
  sentimentSignal: number; // -1..1
  // The deterministic score this prior set implies, on the same 0..100 scale.
  derivedScore: number;
}

const POSITIVE_TIMELINE = [
  /\bthis (week|month|quarter)\b/i,
  /\bready to (view|visit|move|buy|rent)\b/i,
  /\bmoving in\b/i,
  /\bclosing in\b/i,
  /\bneed by\b/i,
  /\bbefore (eid|ramadan|summer|winter|year[- ]end)\b/i,
];

const POSITIVE_SENTIMENT = [
  /\binterested\b/i,
  /\bexcited\b/i,
  /\blove(d|s)? (the|it)\b/i,
  /\bperfect\b/i,
  /\bbook (a |the )?(viewing|visit)\b/i,
  /\bsign\b/i,
  /\boffer\b/i,
];

const NEGATIVE_SENTIMENT = [
  /\bjust (looking|browsing)\b/i,
  /\bnot ready\b/i,
  /\bmaybe (later|next)\b/i,
  /\btoo expensive\b/i,
  /\bout of budget\b/i,
  /\bwindow[- ]shopping\b/i,
  /\bunresponsive\b/i,
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) if (p.test(text)) n += 1;
  return n;
}

interface PriorsInput {
  contact: Contact;
  lastActivityAt: Date | null;
  openDeals: number;
  combinedText: string; // notes + recent activity bodies + conversation summary
}

function computePriors(input: PriorsInput): Priors {
  const c = input.contact;

  // Budget completeness — both bounds present, positive, max ≥ min.
  const hasMin = typeof c.budgetMin === "number" && c.budgetMin > 0;
  const hasMax = typeof c.budgetMax === "number" && c.budgetMax > 0;
  const consistent =
    hasMin && hasMax ? (c.budgetMax as number) >= (c.budgetMin as number) : true;
  const budgetCompleteness = clamp01(
    (hasMin ? 0.5 : 0) + (hasMax ? 0.5 : 0) - (consistent ? 0 : 0.3),
  );

  // Area specificity — number of named areas (cap at 4, each worth 0.25).
  const areaCount = Array.isArray(c.preferredAreas) ? c.preferredAreas.length : 0;
  const areaSpecificity = clamp01(areaCount / 4);

  // Activity recency — linear decay from 0 days (=1) to 30 days (=0).
  let activityRecency = 0;
  if (input.lastActivityAt) {
    const daysSince =
      (Date.now() - input.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000);
    activityRecency = clamp01(1 - daysSince / 30);
  }

  const hasOpenDeal: 0 | 1 = input.openDeals > 0 ? 1 : 0;

  // Timeline + sentiment — keyword counts over notes/activities/summary.
  const text = input.combinedText.toLowerCase();
  const timelineHits = countMatches(text, POSITIVE_TIMELINE);
  const positiveHits = countMatches(text, POSITIVE_SENTIMENT);
  const negativeHits = countMatches(text, NEGATIVE_SENTIMENT);
  const timelineSignal = clamp01(timelineHits / 2);
  const sentimentSignal = Math.max(
    -1,
    Math.min(1, (positiveHits - negativeHits) / 3),
  );

  // Weighted deterministic score on 0..100.
  // Budget + area carry the biggest weight (these are the qualifiers agents
  // actually filter on); recency and open-deal are the engagement proxies.
  const raw =
    100 *
    (0.3 * budgetCompleteness +
      0.2 * areaSpecificity +
      0.2 * activityRecency +
      0.15 * hasOpenDeal +
      0.1 * timelineSignal +
      0.05 * Math.max(0, sentimentSignal)) +
    Math.min(0, sentimentSignal) * 20; // negative sentiment pulls the score down

  const derivedScore = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    budgetCompleteness,
    areaSpecificity,
    activityRecency,
    hasOpenDeal,
    timelineSignal,
    sentimentSignal,
    derivedScore,
  };
}

function tierFromScore(score: number): LeadTier {
  return score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD";
}

// ── AI output schema ────────────────────────────────────────────────────────

const aiResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  tier: z.enum(["HOT", "WARM", "COLD"]),
  reason: z.string().min(1).max(500),
  recommendedAction: z.string().min(1).max(300),
  redFlags: z.array(z.string().max(200)).max(6),
});

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

async function callScorerOnce(
  contact: Contact,
  recentActivities: unknown,
  priors: Priors,
  previousAttempt?: { text: string; error: string },
): Promise<z.infer<typeof aiResultSchema>> {
  const client = anthropic();
  const userMessage = previousAttempt
    ? `Your previous output failed schema validation: ${previousAttempt.error}\n\nReturn the same data but as a valid JSON object matching the schema in the system prompt. Output ONLY the JSON.`
    : `Lead profile:\n\n${JSON.stringify(
        { contact, recentActivities, priors },
        null,
        2,
      )}\n\nScore this lead.`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (previousAttempt) {
    messages.push({
      role: "user",
      content: `Lead profile:\n\n${JSON.stringify(
        { contact, recentActivities, priors },
        null,
        2,
      )}\n\nScore this lead.`,
    });
    messages.push({ role: "assistant", content: previousAttempt.text });
  }
  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  const text = stripCodeFences(extractText(response.content));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ScorerOutputError(text, "response was not valid JSON");
  }
  const validated = aiResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ScorerOutputError(
      text,
      validated.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  return validated.data;
}

class ScorerOutputError extends Error {
  constructor(
    public readonly rawText: string,
    public readonly reason: string,
  ) {
    super(`Scorer output invalid: ${reason}`);
  }
}

// ── Public ──────────────────────────────────────────────────────────────────

export interface ScoreLeadOptions {
  force?: boolean;
}

export async function scoreLead(
  slug: string,
  contactId: string,
  opts: ScoreLeadOptions = {},
): Promise<LeadScoreResult> {
  const contact = await getContact(slug, contactId);

  // Cooldown — return cached score+tier+reason from the existing columns if
  // we scored this contact within the last 7 days. recommendedAction and
  // redFlags aren't persisted, so the cached response says so.
  if (!opts.force && contact.aiScoredAt) {
    const ageMs = Date.now() - new Date(contact.aiScoredAt).getTime();
    if (ageMs < COOLDOWN_MS && contact.aiScore > 0) {
      return {
        score: contact.aiScore,
        tier: (contact.aiTier as LeadTier) ?? tierFromScore(contact.aiScore),
        reason: contact.aiScoreReason ?? "",
        recommendedAction:
          "(Cached — pass force=true to regenerate the action and red flags.)",
        redFlags: [],
      };
    }
  }

  // Pull last 10 activities + open deals count + last activity timestamp.
  const ctxRes = await withTenant(slug, async (db) => {
    const acts = await db.query(
      `SELECT activity_type, subject, body, completed_at, created_at
       FROM activities
       WHERE contact_id = $1
       ORDER BY COALESCE(completed_at, created_at) DESC
       LIMIT 10`,
      [contactId],
    );
    const deals = await db.query(
      `SELECT COUNT(*)::int AS open_count
       FROM deals
       WHERE contact_id = $1
         AND stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')`,
      [contactId],
    );
    return {
      activities: acts.rows,
      openDeals: deals.rows[0]?.open_count ?? 0,
    };
  });

  const recentActivities = ctxRes.activities.map((r) => ({
    activityType: r.activity_type,
    subject: r.subject,
    body: r.body,
    completedAt: r.completed_at,
  }));

  const lastActivityAt = ctxRes.activities[0]
    ? new Date(
        ctxRes.activities[0].completed_at ?? ctxRes.activities[0].created_at,
      )
    : null;

  const combinedText = [
    contact.notes ?? "",
    contact.conversationSummary ?? "",
    ...ctxRes.activities.map((a) => `${a.subject ?? ""}\n${a.body ?? ""}`),
  ].join("\n");

  const priors = computePriors({
    contact,
    lastActivityAt,
    openDeals: ctxRes.openDeals,
    combinedText,
  });

  // First attempt; on schema failure retry once with explicit feedback.
  let aiResult: z.infer<typeof aiResultSchema>;
  try {
    aiResult = await callScorerOnce(contact, recentActivities, priors);
  } catch (err) {
    if (err instanceof ScorerOutputError) {
      try {
        aiResult = await callScorerOnce(contact, recentActivities, priors, {
          text: err.rawText,
          error: err.reason,
        });
      } catch (retryErr) {
        if (retryErr instanceof ScorerOutputError) {
          throw Errors.ai(
            `Lead scorer returned an invalid response after retry: ${retryErr.reason}`,
          );
        }
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  // Blend 60% AI / 40% deterministic priors. The AI sees the priors so it can
  // already reflect them; the floor here protects against a model outlier.
  const blendedScore = Math.round(0.6 * aiResult.score + 0.4 * priors.derivedScore);
  const score = Math.max(0, Math.min(100, blendedScore));
  const tier: LeadTier =
    score >= 80 ? "HOT" : score >= 50 ? "WARM" : aiResult.tier === "COLD" ? "COLD" : tierFromScore(score);

  const result: LeadScoreResult = {
    score,
    tier,
    reason: aiResult.reason,
    recommendedAction: aiResult.recommendedAction,
    redFlags: aiResult.redFlags,
  };

  // Persist score, reason, tier, scored-at. The columns ai_tier and
  // ai_score_reason now stay in sync with the live UI response.
  await withTenant(slug, (db) =>
    db.query(
      `UPDATE contacts
         SET ai_score = $1,
             ai_score_reason = $2,
             ai_tier = $3,
             ai_scored_at = NOW(),
             updated_at = NOW()
       WHERE id = $4`,
      [score, result.reason, tier, contactId],
    ),
  );

  return result;
}
