/**
 * PROPIFY — WhatsApp Real Estate Lead Qualifier
 * Stack: Node.js + Express + 360dialog WhatsApp API + Anthropic Claude
 *
 * Setup:
 *   1. cp .env.example .env  (and fill values)
 *   2. pnpm install
 *   3. pnpm start
 *   4. Expose port 3000 (ngrok in dev, Railway/Render in prod)
 *   5. Set the webhook URL in 360dialog: https://<host>/webhook
 *
 * On each WhatsApp message: qualify the lead with Claude, score 0–100,
 * notify the agent on hot/warm tiers, and POST the qualified lead into
 * PropIQ at PROPIQ_API_URL/api/propify/lead.
 */

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── IN-MEMORY SESSION STORE ───────────────────────────────────────────────
// Replace with Redis or Firestore for multi-instance production.
const sessions = new Map();

function getSession(phone) {
  let s = sessions.get(phone);
  if (!s) {
    s = {
      phone,
      history: [],
      score: 0,
      tier: "cold",
      qualifiers: { q1: false, q2: false, q3: false, q4: false, q5: false },
      propertyRef: null,
      propertyName: null,
      propertyPrice: null,
      propertyDetails: null,
      agentId: null,
      notified: false,
      synced: false,
      startedAt: new Date().toISOString(),
      lastMessage: null,
    };
    sessions.set(phone, s);
  }
  return s;
}

// ─── PROPERTY LOOKUP ────────────────────────────────────────────────────────
// Replace with a real CRM / Qatar property database lookup.
const PROPERTIES = {
  "LUS-4821": {
    name: "3BR Apartment — Lusail Marina District",
    price: "QAR 1,850,000",
    area: "Lusail Marina",
    details: "187 sqm, Floor 12, Ready",
  },
  "PRL-2244": {
    name: "2BR Apartment — The Pearl, Porto Arabia",
    price: "QAR 1,200,000",
    area: "The Pearl",
    details: "124 sqm, Sea view, Freehold",
  },
  "WBL-0091": {
    name: "5BR Villa — West Bay Lagoon",
    price: "QAR 6,500,000",
    area: "West Bay Lagoon",
    details: "520 sqm, Private pool",
  },
  "FXH-3312": {
    name: "Studio — Fox Hills, Lusail",
    price: "QAR 490,000",
    area: "Fox Hills",
    details: "52 sqm, High floor, Off-plan",
  },
};

function lookupProperty(text) {
  const match = text.match(/REF[:\s#-]*([A-Z]{2,4}-\d{3,6})/i);
  if (!match) return null;
  const ref = match[1].toUpperCase();
  return PROPERTIES[ref]
    ? { ref, ...PROPERTIES[ref] }
    : { ref, name: `Property ${ref}`, price: "TBC", area: "Qatar", details: "" };
}

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────
function buildSystemPrompt(session) {
  const propContext = session.propertyRef
    ? `PROPERTY CONTEXT:
Reference: ${session.propertyRef}
Name: ${session.propertyName}
Details: ${session.propertyDetails || ""}
Price: ${session.propertyPrice || "TBC"}`
    : "PROPERTY CONTEXT: Client contacted directly, no specific property yet. Ask what they are looking for.";

  return `You are Propify, a premium AI real estate assistant for a top Qatar real estate agency. You communicate via WhatsApp.

${propContext}

COVERAGE: All of Qatar — Lusail (Marina District, Fox Hills, Waterfront, Entertainment City), The Pearl (Porto Arabia, Medina Centrale, Viva Bahriyah), West Bay, West Bay Lagoon, Msheireb, Al Sadd, Al Waab, Al Wakrah, Barwa City, Al Khor, and all areas.

YOUR TWO JOBS:
1. Answer property questions helpfully and build rapport
2. Qualify the lead through natural conversation (never interrogate)

QUALIFICATION SIGNALS:
- q1 Budget: They mention budget range, ask about price negotiation, or financing
- q2 Timeline: When do they want to buy/move? Urgency indicates intent
- q3 Decision maker: Buying for themselves vs gathering info for someone else
- q4 Financing: Cash buyer, mortgage pre-approval, or payment plan preference
- q5 Serious intent: Specific questions (service charge, exact sqm, viewing) vs vague browsing

SCORING RULES:
- 80–100 HOT: Budget confirmed + timeline urgent + decision maker + financing ready
- 50–79 WARM: 3 of 5 qualifiers met, showing real interest
- 20–49 COLD: Browsing, vague, no urgency shown yet
- 0–19 DEAD: Wrong contact, spam, zero engagement

KEY QATAR FACTS:
- Freehold for expats: The Pearl, Lusail, West Bay Lagoon, Al Dafna, Al Khor Resort + 6 other zones
- No property tax, no capital gains tax in Qatar
- Mortgages for expats: up to 70% LTV, min 3 months Qatar residency
- Banks: QNB, QIB, Masraf Al Rayan, Doha Bank, HSBC Qatar
- Service charges: QAR 10–18/sqm/year (Lusail), QAR 15–22 (Pearl)
- Rental yields: 6–9% Lusail, 5–8% Pearl, 7–10% West Bay apartments
- Off-plan payment: typically 30/70 or 40/60

WHATSAPP STYLE RULES:
- Keep messages SHORT — max 3 short paragraphs
- No bullet points unless listing 3+ items
- Use *bold* for key numbers/facts (WhatsApp markdown)
- Sound like a helpful human, not a robot
- Bilingual: if client writes in Arabic, respond in Arabic

APPEND after every response (hidden — parsed by server):
[SCORE:{"score":NUMBER,"tier":"hot|warm|cold|dead","q1":BOOL,"q2":BOOL,"q3":BOOL,"q4":BOOL,"q5":BOOL}]`;
}

// ─── WHATSAPP SEND ──────────────────────────────────────────────────────────
async function sendWhatsApp(to, message) {
  if (!process.env.DIALOG360_API_KEY) {
    console.warn("[WA] DIALOG360_API_KEY not set, skipping send");
    return;
  }
  try {
    await axios.post(
      "https://waba.360dialog.io/v1/messages",
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          "D360-API-KEY": process.env.DIALOG360_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("[WA] send error:", err.response?.data || err.message);
  }
}

// ─── AGENT NOTIFICATION ─────────────────────────────────────────────────────
async function notifyAgent(session) {
  if (session.notified) return;
  session.notified = true;
  const agentPhone = process.env.AGENT_PHONE_NUMBER;
  if (!agentPhone) return;

  const tierEmoji =
    { hot: "🔴", warm: "🟡", cold: "🔵", dead: "⚫" }[session.tier] || "⚪";
  const q = session.qualifiers;

  const message = `${tierEmoji} *PROPIFY LEAD ALERT · Score ${session.score}/100*

📱 *Client:* ${session.phone}
🏠 *Property:* ${session.propertyName || "Not specified"} (${session.propertyRef || "N/A"})
🕒 *Started:* ${session.startedAt}

*Qualification:*
${q.q1 ? "✅" : "❌"} Budget confirmed
${q.q2 ? "✅" : "❌"} Timeline clear
${q.q3 ? "✅" : "❌"} Decision maker
${q.q4 ? "✅" : "❌"} Financing ready
${q.q5 ? "✅" : "❌"} Serious intent

*Tier: ${session.tier.toUpperCase()}*

${
  session.tier === "hot"
    ? "→ _Call now — high conversion probability_"
    : session.tier === "warm"
      ? "→ _Follow up within 2 hours_"
      : "→ _Add to nurture sequence_"
}`;

  await sendWhatsApp(agentPhone, message);
  console.log(
    `[NOTIFY] Agent alerted for ${session.phone} — ${session.score} (${session.tier})`,
  );
}

// ─── PROPIQ SYNC ────────────────────────────────────────────────────────────
function buildSummary(session) {
  const q = session.qualifiers;
  return [
    `Score: ${session.score}/100 (${session.tier.toUpperCase()})`,
    `Property: ${session.propertyName || "N/A"} (${session.propertyRef || "N/A"})`,
    `Budget: ${q.q1 ? "Yes" : "No"} | Timeline: ${q.q2 ? "Yes" : "No"} | Decision maker: ${q.q3 ? "Yes" : "No"}`,
    `Financing: ${q.q4 ? "Yes" : "No"} | Serious intent: ${q.q5 ? "Yes" : "No"}`,
  ].join("\n");
}

async function syncLeadToPropIQ(session) {
  if (
    !process.env.PROPIQ_API_URL ||
    !process.env.PROPIFY_WEBHOOK_SECRET ||
    !process.env.PROPIQ_TENANT_SLUG
  ) {
    return;
  }
  if (session.synced) return;

  try {
    await axios.post(
      `${process.env.PROPIQ_API_URL}/api/propify/lead`,
      {
        tenant_slug: process.env.PROPIQ_TENANT_SLUG,
        agent_id: session.agentId || null,
        phone: session.phone,
        property_ref: session.propertyRef,
        property_name: session.propertyName,
        score: session.score,
        tier: session.tier,
        qualifiers: session.qualifiers,
        conversation_summary: buildSummary(session),
        source: "property_finder",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PROPIFY_WEBHOOK_SECRET}`,
        },
        timeout: 8000,
      },
    );
    session.synced = true;
    console.log(
      `[PROPIQ] Lead synced: ${session.phone} (${session.tier}, ${session.score})`,
    );
  } catch (err) {
    console.error("[PROPIQ] Sync failed:", err.response?.data || err.message);
  }
}

// ─── SCORE PARSING ──────────────────────────────────────────────────────────
function parseScore(text) {
  const match = text.match(/\[SCORE:(.*?)\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ─── WEBHOOK ────────────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Acknowledge to 360dialog immediately, then process async.
  res.sendStatus(200);

  try {
    const messages = req.body?.messages;
    if (!messages?.length) return;

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      const phone = msg.from;
      const text = msg.text?.body?.trim();
      if (!text) continue;

      console.log(`[IN] ${phone}: ${text}`);

      const session = getSession(phone);
      session.lastMessage = new Date().toISOString();

      if (!session.propertyRef) {
        const prop = lookupProperty(text);
        if (prop) {
          session.propertyRef = prop.ref;
          session.propertyName = prop.name;
          session.propertyPrice = prop.price;
          session.propertyDetails = prop.details;
          console.log(
            `[PROP] ${phone} interested in ${prop.ref}: ${prop.name}`,
          );
        }
      }

      session.history.push({ role: "user", content: text });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: buildSystemPrompt(session),
        messages: session.history,
      });

      let reply = response.content[0]?.text || "Sorry, please try again.";

      const scoreData = parseScore(reply);
      if (scoreData) {
        session.score = scoreData.score;
        session.tier = scoreData.tier;
        session.qualifiers = {
          q1: !!scoreData.q1,
          q2: !!scoreData.q2,
          q3: !!scoreData.q3,
          q4: !!scoreData.q4,
          q5: !!scoreData.q5,
        };
        reply = reply.replace(/\[SCORE:.*?\]/g, "").trim();
        console.log(
          `[SCORE] ${phone}: ${session.score}/100 (${session.tier})`,
        );
      }

      session.history.push({ role: "assistant", content: reply });
      await sendWhatsApp(phone, reply);

      const isHot = session.tier === "hot" && session.score >= 70;
      const isWarm =
        session.tier === "warm" &&
        session.score >= 55 &&
        session.history.length >= 6;

      if (!session.notified && (isHot || isWarm)) {
        await notifyAgent(session);
        await syncLeadToPropIQ(session);
      }
    }
  } catch (err) {
    console.error("[ERROR]", err.message);
  }
});

app.get("/webhook", (_req, res) => res.sendStatus(200));

// ─── DASHBOARD API (in-memory snapshot) ─────────────────────────────────────
app.get("/api/leads", (_req, res) => {
  const leads = Array.from(sessions.values())
    .sort((a, b) => b.score - a.score)
    .map((s) => ({
      phone: s.phone,
      score: s.score,
      tier: s.tier,
      property: s.propertyName || "Not specified",
      ref: s.propertyRef,
      qualifiers: s.qualifiers,
      notified: s.notified,
      synced: s.synced,
      startedAt: s.startedAt,
      lastMessage: s.lastMessage,
      messageCount: s.history.filter((m) => m.role === "user").length,
    }));
  res.json({ total: leads.length, leads });
});

app.get("/api/leads/:phone", (req, res) => {
  const session = sessions.get(req.params.phone);
  if (!session) return res.status(404).json({ error: "Lead not found" });
  res.json(session);
});

app.get("/health", (_req, res) =>
  res.json({ status: "ok", leads: sessions.size }),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[propify-backend] listening on port ${PORT}`),
);
