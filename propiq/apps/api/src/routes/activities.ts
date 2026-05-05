import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { created, ok } from "../lib/response";
import {
  createActivity,
  deleteActivity,
  listActivities,
} from "../services/activities";

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth, requireTenant);

const activityTypeEnum = z.enum([
  "NOTE",
  "CALL",
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "MEETING",
  "VIEWING",
  "TASK",
  "AI_CALL",
]);

const directionEnum = z.enum(["INBOUND", "OUTBOUND"]);

const listQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createSchema = z.object({
  activityType: activityTypeEnum,
  direction: directionEnum.nullable().optional(),
  subject: z.string().max(255).nullable().optional(),
  body: z.string().nullable().optional(),
  status: z.string().max(20).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  propertyId: z.string().uuid().nullable().optional(),
});

activitiesRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await listActivities(req.user!.agencySlug, req.query);
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

activitiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const a = await createActivity(req.user!.agencySlug, {
      ...req.body,
      createdBy: req.user!.userId,
    });
    created(res, a);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteActivity(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
