import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { created, ok } from "../lib/response";
import {
  createDeal,
  deleteDeal,
  getDeal,
  getPipeline,
  listDeals,
  updateDeal,
} from "../services/deals";

export const dealsRouter = Router();

dealsRouter.use(requireAuth, requireTenant);

const dealTypeEnum = z.enum(["SALE", "RENT"]);
const pipelineTypeEnum = z.enum(["SALES", "LEASE"]);
const stageEnum = z.enum([
  "NEW_LEAD",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWED",
  "OFFER_MADE",
  "NEGOTIATING",
  "CONTRACT_SENT",
  "CLOSED_WON",
  "CLOSED_LOST",
]);

const baseFields = {
  title: z.string().min(2).max(255),
  dealType: dealTypeEnum.optional(),
  pipelineType: pipelineTypeEnum.optional(),
  stage: stageEnum.optional(),
  value: z.number().int().nonnegative().nullable().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  commissionValue: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedClose: z.string().datetime().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().max(50).nullable().optional(),
  notes: z.string().nullable().optional(),
};

const createSchema = z.object(baseFields);
const updateSchema = z
  .object({
    ...baseFields,
    title: baseFields.title.optional(),
    closedAt: z.string().datetime().nullable().optional(),
    lostReason: z.string().nullable().optional(),
  })
  .partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  stage: stageEnum.optional(),
  pipelineType: pipelineTypeEnum.optional(),
  contactId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const pipelineQuerySchema = z.object({
  pipelineType: pipelineTypeEnum.optional(),
});

const stageOnlySchema = z.object({ stage: stageEnum });

dealsRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await listDeals(req.user!.agencySlug, req.query);
      ok(res, result.items, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  },
);

dealsRouter.get(
  "/pipeline",
  validate(pipelineQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const groups = await getPipeline(
        req.user!.agencySlug,
        (req.query as { pipelineType?: "SALES" | "LEASE" }).pipelineType,
      );
      ok(res, groups);
    } catch (err) {
      next(err);
    }
  },
);

dealsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const d = await createDeal(req.user!.agencySlug, {
      ...req.body,
      assignedTo: req.body.assignedTo ?? req.user!.userId,
    });
    created(res, d);
  } catch (err) {
    next(err);
  }
});

dealsRouter.get("/:id", async (req, res, next) => {
  try {
    const d = await getDeal(req.user!.agencySlug, req.params.id!);
    ok(res, d);
  } catch (err) {
    next(err);
  }
});

dealsRouter.patch(
  "/:id",
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const d = await updateDeal(
        req.user!.agencySlug,
        req.params.id!,
        req.body,
      );
      ok(res, d);
    } catch (err) {
      next(err);
    }
  },
);

// Dedicated stage-change endpoint for the Kanban drag-and-drop.
dealsRouter.patch(
  "/:id/stage",
  validate(stageOnlySchema),
  async (req, res, next) => {
    try {
      const d = await updateDeal(req.user!.agencySlug, req.params.id!, {
        stage: req.body.stage,
      });
      ok(res, d);
    } catch (err) {
      next(err);
    }
  },
);

dealsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteDeal(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
