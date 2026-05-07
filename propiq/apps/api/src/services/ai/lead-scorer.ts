import type { Contact, LeadScoreResult, LeadTier } from "@propiq/shared";
import { anthropic, CLAUDE_MODEL, extractText } from "../anthropic";
import { getContact } from "../contacts";
import { withTenant } from "../../db/tenant";
import { Errors } from "../../lib/errors";

const SYSTEM = `You are a sales operations expert for a real-estate agency in Qatar. You score buyer/tenant leads on quality from 0 to 100.

You receive a contact's profile and recent interaction history. You return ONE JSON object:

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

interface ScoreInput {
  contact: Contact;
  recentActivities: Array<{
    activityType: string;
    subject: string | null;
    body: string | null;
    completedAt: string | null;
  }>;
}

export async function scoreLead(
  slug: string,
  contactId: string,
): Promise<LeadScoreResult> {
  const contact = await getContact(slug, contactId);

  // Pull last 10 activities for context.
  const activitiesRes = await withTenant(slug, (client) =>
    client.query(
      `SELECT activity_type, subject, body, completed_at
       FROM activities
       WHERE contact_id = $1
       ORDER BY COALESCE(completed_at, created_at) DESC
       LIMIT 10`,
      [contactId],
    ),
  );
  const recent = activitiesRes.rows.map((r) => ({
    activityType: r.activity_type,
    subject: r.subject,
    body: r.body,
    completedAt: r.completed_at,
  }));

  const input: ScoreInput = { contact, recentActivities: recent };

  const client = anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Lead profile:\n\n${JSON.stringify(input, null, 2)}\n\nScore this lead.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Partial<LeadScoreResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.ai("AI returned non-JSON lead score");
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(Number(parsed.score) || 0)),
  );
  const tier: LeadTier =
    parsed.tier === "HOT" || parsed.tier === "WARM" || parsed.tier === "COLD"
      ? parsed.tier
      : score >= 80
        ? "HOT"
        : score >= 50
          ? "WARM"
          : "COLD";

  const result: LeadScoreResult = {
    score,
    tier,
    reason: String(parsed.reason ?? "").slice(0, 500),
    recommendedAction: String(parsed.recommendedAction ?? "").slice(0, 300),
    redFlags: Array.isArray(parsed.redFlags)
      ? parsed.redFlags.map((f) => String(f).slice(0, 200)).slice(0, 6)
      : [],
  };

  // Persist back onto the contact so the UI shows the score across the app.
  await withTenant(slug, (db) =>
    db.query(
      `UPDATE contacts
         SET ai_score = $1,
             ai_score_reason = $2,
             ai_scored_at = NOW(),
             updated_at = NOW()
       WHERE id = $3`,
      [score, result.reason, contactId],
    ),
  );

  return result;
}
