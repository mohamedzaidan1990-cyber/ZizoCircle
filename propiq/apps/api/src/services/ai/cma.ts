import PDFDocument from "pdfkit";
import type { Property } from "@propiq/shared";
import { anthropic, CLAUDE_MODEL, extractText } from "../anthropic";
import { getProperty } from "../properties";
import { Errors } from "../../lib/errors";

export interface CmaNarrative {
  summary: string;
  pricingRecommendation: {
    suggestedMin: number;
    suggestedMax: number;
    rationale: string;
  };
  marketContext: string;
  comparableAnalysis: Array<{ propertyId: string; insight: string }>;
}

export interface CmaPayload {
  subject: Property;
  comparables: Property[];
  generatedAt: string;
  narrative: CmaNarrative;
}

const SYSTEM = `You are a senior real-estate analyst preparing a Comparative Market Analysis (CMA) for a Qatari agency.

You receive a SUBJECT property and 1-6 COMPARABLE properties. You return ONE JSON object:

{
  "summary": "3-5 sentences positioning the subject vs. the comp set. Plain prose.",
  "pricingRecommendation": {
    "suggestedMin": <integer in subject's currency>,
    "suggestedMax": <integer in subject's currency>,
    "rationale": "2-3 sentences explaining the range, citing specific comps."
  },
  "marketContext": "2-3 sentences on the local market for this property type/area in Qatar.",
  "comparableAnalysis": [
    { "propertyId": "<id>", "insight": "1 sentence: how this comp compares (price/sqm, layout, location, condition)." }
  ]
}

Rules:
- Anchor pricing to the actual numbers in the input. If subject lists at QAR 3M and comps cluster at 2.7-3.2M, your suggested range should reflect that — don't invent.
- Compute price/sqm where both price and area are present, and reference it when relevant.
- Be specific about Qatar context (The Pearl, Lusail, West Bay, etc.) when the subject's area is named.
- comparableAnalysis must include exactly one entry per comparable, in input order, using the supplied propertyId.
- Output ONLY the JSON object. No markdown, no preamble.`;

export async function generateCmaNarrative(
  slug: string,
  subjectId: string,
  comparableIds: string[],
): Promise<CmaPayload> {
  if (comparableIds.length === 0) {
    throw Errors.validation("Select at least one comparable property");
  }
  if (comparableIds.length > 8) {
    throw Errors.validation("Maximum 8 comparables");
  }

  const subject = await getProperty(slug, subjectId);
  const comparables = await Promise.all(
    comparableIds.map((id) => getProperty(slug, id)),
  );

  const compactProperty = (p: Property) => ({
    id: p.id,
    title: p.title,
    propertyType: p.propertyType,
    listingType: p.listingType,
    status: p.status,
    price: p.price,
    rentPrice: p.rentPrice,
    rentPeriod: p.rentPeriod,
    currency: p.currency,
    areaSqm: p.areaSqm,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpaces: p.parkingSpaces,
    floorNumber: p.floorNumber,
    furnished: p.furnished,
    country: p.country,
    city: p.city,
    area: p.area,
    subArea: p.subArea,
    buildingName: p.buildingName,
    pricePerSqm:
      p.price && p.areaSqm ? Math.round(p.price / Number(p.areaSqm)) : null,
  });

  const input = {
    subject: compactProperty(subject),
    comparables: comparables.map(compactProperty),
  };

  const client = anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2500,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `${JSON.stringify(input, null, 2)}\n\nGenerate the CMA.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Partial<CmaNarrative>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.ai("AI returned non-JSON CMA");
  }

  if (
    !parsed.summary ||
    !parsed.pricingRecommendation ||
    !parsed.marketContext ||
    !Array.isArray(parsed.comparableAnalysis)
  ) {
    throw Errors.ai("AI returned incomplete CMA");
  }

  return {
    subject,
    comparables,
    generatedAt: new Date().toISOString(),
    narrative: {
      summary: String(parsed.summary).trim(),
      pricingRecommendation: {
        suggestedMin: Math.max(
          0,
          Math.round(Number(parsed.pricingRecommendation.suggestedMin) || 0),
        ),
        suggestedMax: Math.max(
          0,
          Math.round(Number(parsed.pricingRecommendation.suggestedMax) || 0),
        ),
        rationale: String(
          parsed.pricingRecommendation.rationale ?? "",
        ).trim(),
      },
      marketContext: String(parsed.marketContext).trim(),
      comparableAnalysis: parsed.comparableAnalysis
        .map((c: { propertyId?: string; insight?: string }) => ({
          propertyId: String(c.propertyId ?? ""),
          insight: String(c.insight ?? ""),
        }))
        .filter((c) => c.propertyId && c.insight),
    },
  };
}

// ── PDF rendering ───────────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined, currency = "QAR"): string {
  if (!n) return "—";
  return `${currency} ${n.toLocaleString()}`;
}

function fmtPropertySummary(p: Property): string {
  const parts: string[] = [];
  if (p.bedrooms != null) parts.push(`${p.bedrooms}BR`);
  if (p.bathrooms != null) parts.push(`${p.bathrooms}BA`);
  if (p.areaSqm != null) parts.push(`${p.areaSqm} sqm`);
  if (p.area) parts.push(p.area);
  if (p.subArea) parts.push(p.subArea);
  return parts.join(" · ") || "—";
}

export function renderCmaPdf(payload: CmaPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `CMA — ${payload.subject.title}`,
        Author: "PropIQ",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const brand = "#0F766E";
    const muted = "#475569";

    // Header
    doc
      .fillColor(brand)
      .fontSize(10)
      .text("PROPIQ COMPARATIVE MARKET ANALYSIS", { characterSpacing: 1.5 });
    doc
      .moveDown(0.25)
      .fillColor("#0f172a")
      .fontSize(20)
      .text(payload.subject.title);
    doc
      .moveDown(0.2)
      .fillColor(muted)
      .fontSize(10)
      .text(
        `Generated ${new Date(payload.generatedAt).toLocaleString()}`,
      );
    doc
      .moveTo(50, doc.y + 8)
      .lineTo(545, doc.y + 8)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(1.2);

    // Subject
    doc.fillColor("#0f172a").fontSize(13).text("Subject Property");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(muted);
    const subj = payload.subject;
    doc.text(
      `${subj.propertyType} · ${subj.listingType === "RENT" ? "For rent" : "For sale"}`,
    );
    doc.text(fmtPropertySummary(subj));
    doc.fillColor("#0f172a");
    if (subj.listingType === "RENT") {
      doc.text(
        `Listed at: ${fmtMoney(subj.rentPrice, subj.currency)}${subj.rentPeriod ? `/${subj.rentPeriod}` : ""}`,
      );
    } else {
      doc.text(`Listed at: ${fmtMoney(subj.price, subj.currency)}`);
    }
    if (subj.price && subj.areaSqm) {
      doc.text(
        `Price/sqm: ${fmtMoney(Math.round(subj.price / Number(subj.areaSqm)), subj.currency)}`,
      );
    }
    doc.moveDown(1);

    // Pricing Recommendation
    doc.fillColor("#0f172a").fontSize(13).text("Pricing Recommendation");
    doc.moveDown(0.3);
    doc
      .fontSize(16)
      .fillColor(brand)
      .text(
        `${fmtMoney(payload.narrative.pricingRecommendation.suggestedMin, subj.currency)} – ${fmtMoney(payload.narrative.pricingRecommendation.suggestedMax, subj.currency)}`,
      );
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#0f172a")
      .text(payload.narrative.pricingRecommendation.rationale, {
        align: "left",
      });
    doc.moveDown(1);

    // Summary
    doc.fontSize(13).text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(10).text(payload.narrative.summary, { align: "left" });
    doc.moveDown(1);

    // Market Context
    doc.fontSize(13).text("Market Context");
    doc.moveDown(0.3);
    doc.fontSize(10).text(payload.narrative.marketContext, { align: "left" });
    doc.moveDown(1);

    // Comparables
    doc.fontSize(13).text("Comparables");
    doc.moveDown(0.4);

    payload.comparables.forEach((c, idx) => {
      if (doc.y > 720) doc.addPage();
      const insight = payload.narrative.comparableAnalysis.find(
        (a) => a.propertyId === c.id,
      )?.insight;
      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(`${idx + 1}. ${c.title}`);
      doc.fontSize(9).fillColor(muted).text(fmtPropertySummary(c));
      const priceLine =
        c.listingType === "RENT"
          ? `${fmtMoney(c.rentPrice, c.currency)}${c.rentPeriod ? `/${c.rentPeriod}` : ""}`
          : fmtMoney(c.price, c.currency);
      const ppsqm =
        c.price && c.areaSqm
          ? ` · ${fmtMoney(Math.round(c.price / Number(c.areaSqm)), c.currency)}/sqm`
          : "";
      doc.fillColor("#0f172a").text(`${priceLine}${ppsqm}`);
      if (insight) {
        doc.fontSize(9).fillColor(muted).text(insight, { align: "left" });
      }
      doc.moveDown(0.7);
    });

    doc
      .fontSize(8)
      .fillColor(muted)
      .text(
        "This CMA was prepared with AI assistance. Pricing recommendations are advisory and should be validated against current market activity before use.",
        50,
        780,
        { width: 495, align: "center" },
      );

    doc.end();
  });
}
