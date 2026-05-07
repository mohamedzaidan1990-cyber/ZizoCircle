import type { Response } from "express";
import { anthropic, CLAUDE_MODEL, extractText } from "../anthropic";
import { Errors } from "../../lib/errors";

export type NegotiationScenario =
  | "PRICE_OBJECTION"
  | "MULTIPLE_OFFERS"
  | "REPAIR_REQUESTS"
  | "FINANCING_FALLTHROUGH"
  | "RELOCATION_DEADLINE"
  | "FREE_FORM";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SCENARIO_PROMPTS: Record<NegotiationScenario, string> = {
  PRICE_OBJECTION:
    "Roleplay as a buyer who thinks the listing is 8-12% overpriced. Push back on the agent's first response with a specific counter, but stay realistic — you're motivated, not confrontational.",
  MULTIPLE_OFFERS:
    "Roleplay as a seller's agent in a multi-offer situation. The agent (the trainee) represents a buyer who wants to win but not overpay. Bring realistic competing-offer context to the conversation.",
  REPAIR_REQUESTS:
    "Roleplay as a buyer who, post-inspection, is asking for QAR 60-90K of repairs/credits. The seller is mid-relocation and reluctant. The agent has to mediate.",
  FINANCING_FALLTHROUGH:
    "Roleplay as a seller whose buyer's financing just fell through 8 days before close. You are frustrated. The agent has to keep the deal alive with backup options.",
  RELOCATION_DEADLINE:
    "Roleplay as a tenant relocating internally for work in 3 weeks. Budget firm at QAR 12-14K/month. Pushing for early-move incentives.",
  FREE_FORM:
    "Open coaching session — let the agent (the user) drive what they want to practice. If they don't lead, ask them what scenario they'd like to work on.",
};

const COACH_SYSTEM = (scenario: NegotiationScenario) => `You are an elite real-estate negotiation coach for an agency in Qatar. You run live roleplay sessions with the agent (the user).

Your role split:
1. ROLEPLAY MODE — when the agent makes a move, respond IN CHARACTER as the counterparty. Be realistic, not theatrical. Don't capitulate too fast. Don't be a pushover, don't be a caricature.
2. COACHING MODE — when the agent asks for feedback, advice, or "pause", drop character. Give one specific, actionable observation. Be candid; don't flatter.

You decide which mode to be in by reading the agent's last message:
- "Pause" / "Hold on" / "Coach me" / "Feedback" / "What should I…" / question about technique → COACHING MODE.
- Anything that sounds like a move (offer, response, framing) → ROLEPLAY MODE.

Scenario for THIS session: ${SCENARIO_PROMPTS[scenario]}

Tone guidance:
- Roleplay: tight messages (2-4 sentences), no asterisks-action narration, no "*sighs*" theatrics.
- Coaching: 2-4 sentences, lead with the diagnosis, then the fix.
- Don't break the fourth wall in roleplay unless explicitly asked.

You write in English unless the agent writes in Arabic, in which case you respond in Arabic.

If the agent's first message is empty or vague, kick off the scenario yourself — set the scene in 1-2 sentences and make the opening move.`;

export async function streamNegotiationTurn(
  res: Response,
  scenario: NegotiationScenario,
  history: ChatTurn[],
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  if (history.length === 0) {
    history = [
      { role: "user", content: "Begin the scenario." },
    ];
  }

  // Map turns to the API shape — must alternate user/assistant.
  const messages = history.map((t) => ({ role: t.role, content: t.content }));

  try {
    const client = anthropic();
    const stream = await client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: COACH_SYSTEM(scenario),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    stream.on("text", (delta: string) => {
      send("delta", { text: delta });
    });

    const final = await stream.finalMessage();
    send("done", {
      stopReason: final.stop_reason,
      usage: {
        input: final.usage.input_tokens,
        output: final.usage.output_tokens,
        cacheRead: final.usage.cache_read_input_tokens,
        cacheCreation: final.usage.cache_creation_input_tokens,
      },
    });
  } catch (err) {
    send("error", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    res.end();
  }
}

// ── Debrief scorecard ────────────────────────────────────────────────────────

export interface DebriefScorecard {
  overallScore: number;
  rubric: {
    discovery: number;
    framing: number;
    concessions: number;
    closing: number;
  };
  whatWentWell: string[];
  whatToImprove: string[];
  oneThingNextTime: string;
}

const DEBRIEF_SYSTEM = `You are a negotiation coach reviewing a roleplay session transcript between an AGENT (the user being coached) and a COUNTERPARTY (you, in roleplay mode previously).

You return ONE JSON object with a fair, candid debrief:

{
  "overallScore": <integer 0-100>,
  "rubric": {
    "discovery": <0-25>,
    "framing": <0-25>,
    "concessions": <0-25>,
    "closing": <0-25>
  },
  "whatWentWell": ["2-4 specific moments. Quote brief phrases from the transcript."],
  "whatToImprove": ["2-4 specific moments. Be candid, not soft."],
  "oneThingNextTime": "1 sentence: the single highest-leverage change for next session."
}

Scoring:
- discovery: did the agent ask about motivation, timeline, alternatives?
- framing: did they anchor and reframe rather than just react?
- concessions: did they trade rather than give? did they protect their seller/buyer's value?
- closing: did they advance toward a decision, or drift?
- overallScore should be the sum of the rubric (out of 100).

If the session was too short (< 4 agent turns), say so plainly in oneThingNextTime and score conservatively.

Output ONLY the JSON object.`;

export async function debriefSession(
  scenario: NegotiationScenario,
  history: ChatTurn[],
): Promise<DebriefScorecard> {
  const client = anthropic();
  const transcript = history
    .map((t) => `${t.role === "user" ? "AGENT" : "COUNTERPARTY"}: ${t.content}`)
    .join("\n\n");
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: DEBRIEF_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Scenario: ${scenario}\n\nTranscript:\n\n${transcript}\n\nDebrief this session.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Partial<DebriefScorecard>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.ai("AI returned non-JSON debrief");
  }

  const clamp = (n: unknown, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

  return {
    overallScore: clamp(parsed.overallScore, 0, 100),
    rubric: {
      discovery: clamp(parsed.rubric?.discovery, 0, 25),
      framing: clamp(parsed.rubric?.framing, 0, 25),
      concessions: clamp(parsed.rubric?.concessions, 0, 25),
      closing: clamp(parsed.rubric?.closing, 0, 25),
    },
    whatWentWell: Array.isArray(parsed.whatWentWell)
      ? parsed.whatWentWell.map(String).slice(0, 6)
      : [],
    whatToImprove: Array.isArray(parsed.whatToImprove)
      ? parsed.whatToImprove.map(String).slice(0, 6)
      : [],
    oneThingNextTime: String(parsed.oneThingNextTime ?? "").slice(0, 300),
  };
}
