import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { ok, created } from "../lib/response";
import { generateAiInsights } from "../services/ai-insights";
import { generateReactivationMessage } from "../services/reactivation";
import { createActivity } from "../services/activities";
import {
  applyListingContent,
  generateListingContent,
} from "../services/ai/listing-writer";
import { scoreLead } from "../services/ai/lead-scorer";
import { generateCmaNarrative, renderCmaPdf } from "../services/ai/cma";
import {
  debriefSession,
  streamNegotiationTurn,
  type ChatTurn,
  type NegotiationScenario,
} from "../services/ai/negotiation-coach";

export const aiRouter = Router();

aiRouter.use(requireAuth, requireTenant);

// ── Insights & reactivation (existing) ──────────────────────────────────────

aiRouter.get("/insights", async (req, res, next) => {
  try {
    const insights = await generateAiInsights(req.user!.agencySlug);
    ok(res, insights);
  } catch (err) {
    next(err);
  }
});

const reactivateSchema = z.object({
  contactId: z.string().uuid(),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  logActivity: z.boolean().optional(),
});

aiRouter.post(
  "/reactivate",
  validate(reactivateSchema),
  async (req, res, next) => {
    try {
      const message = await generateReactivationMessage(
        req.user!.agencySlug,
        req.body.contactId,
        req.body.channel,
      );
      if (req.body.logActivity) {
        await createActivity(req.user!.agencySlug, {
          activityType: req.body.channel === "EMAIL" ? "EMAIL" : "WHATSAPP",
          direction: "OUTBOUND",
          subject: message.subject ?? "Re-engagement message generated",
          body: message.body,
          status: "DRAFT",
          contactId: req.body.contactId,
          createdBy: req.user!.userId,
        });
      }
      ok(res, message);
    } catch (err) {
      next(err);
    }
  },
);

// ── Listing Writer ──────────────────────────────────────────────────────────

const listingWriterSchema = z.object({
  propertyId: z.string().uuid(),
});
const applyListingSchema = z.object({
  propertyId: z.string().uuid(),
  content: z.object({
    description_en: z.string().min(1),
    description_ar: z.string().min(1),
    highlights_en: z.array(z.string()),
    highlights_ar: z.array(z.string()),
    meta_description_en: z.string(),
    meta_description_ar: z.string(),
  }),
});

aiRouter.post(
  "/listing-writer/generate",
  validate(listingWriterSchema),
  async (req, res, next) => {
    try {
      const content = await generateListingContent(
        req.user!.agencySlug,
        req.body.propertyId,
      );
      ok(res, content);
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  "/listing-writer/apply",
  validate(applyListingSchema),
  async (req, res, next) => {
    try {
      const property = await applyListingContent(
        req.user!.agencySlug,
        req.body.propertyId,
        req.body.content,
      );
      ok(res, property);
    } catch (err) {
      next(err);
    }
  },
);

// ── Lead Scorer ─────────────────────────────────────────────────────────────

const scorerSchema = z.object({
  contactId: z.string().uuid(),
  force: z.boolean().optional(),
});

aiRouter.post(
  "/lead-scorer/score",
  validate(scorerSchema),
  async (req, res, next) => {
    try {
      const result = await scoreLead(
        req.user!.agencySlug,
        req.body.contactId,
        { force: req.body.force === true },
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// ── CMA ─────────────────────────────────────────────────────────────────────

const cmaSchema = z.object({
  subjectId: z.string().uuid(),
  comparableIds: z.array(z.string().uuid()).min(1).max(8),
});

aiRouter.post("/cma/generate", validate(cmaSchema), async (req, res, next) => {
  try {
    const payload = await generateCmaNarrative(
      req.user!.agencySlug,
      req.body.subjectId,
      req.body.comparableIds,
    );
    ok(res, payload);
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/cma/pdf", validate(cmaSchema), async (req, res, next) => {
  try {
    const payload = await generateCmaNarrative(
      req.user!.agencySlug,
      req.body.subjectId,
      req.body.comparableIds,
    );
    const pdf = await renderCmaPdf(payload);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cma-${payload.subject.title.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60)}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// ── Negotiation Coach ───────────────────────────────────────────────────────

const scenarioEnum = z.enum([
  "PRICE_OBJECTION",
  "MULTIPLE_OFFERS",
  "REPAIR_REQUESTS",
  "FINANCING_FALLTHROUGH",
  "RELOCATION_DEADLINE",
  "FREE_FORM",
]);

const coachStreamSchema = z.object({
  scenario: scenarioEnum,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(50),
});

aiRouter.post(
  "/negotiation/stream",
  validate(coachStreamSchema),
  async (req, res, next) => {
    try {
      await streamNegotiationTurn(
        res,
        req.body.scenario as NegotiationScenario,
        req.body.history as ChatTurn[],
      );
    } catch (err) {
      next(err);
    }
  },
);

const debriefSchema = z.object({
  scenario: scenarioEnum,
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    }),
  ),
});

aiRouter.post(
  "/negotiation/debrief",
  validate(debriefSchema),
  async (req, res, next) => {
    try {
      const score = await debriefSession(
        req.body.scenario as NegotiationScenario,
        req.body.history as ChatTurn[],
      );
      created(res, score);
    } catch (err) {
      next(err);
    }
  },
);
