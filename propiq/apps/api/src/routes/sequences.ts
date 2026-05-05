import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { ok, created } from "../lib/response";
import {
  createSequence,
  deleteSequence,
  enqueueSequence,
  listSequences,
  setSequenceActive,
} from "../services/sequences";

export const sequencesRouter = Router();
sequencesRouter.use(requireAuth, requireTenant);

const stepSchema = z.object({
  templateId: z.string().uuid(),
  delayHours: z.number().int().min(0).max(720),
});

const createSchema = z.object({
  name: z.string().min(1).max(255),
  triggerType: z.string().max(50).nullable().optional(),
  steps: z.array(stepSchema).min(1).max(20),
  isActive: z.boolean().optional(),
});

const enqueueSchema = z.object({
  contactId: z.string().uuid(),
});

sequencesRouter.get("/", async (req, res, next) => {
  try {
    const items = await listSequences(req.user!.agencySlug);
    ok(res, items);
  } catch (err) {
    next(err);
  }
});

sequencesRouter.post(
  "/",
  validate(createSchema),
  async (req, res, next) => {
    try {
      const s = await createSequence(req.user!.agencySlug, {
        ...req.body,
        createdBy: req.user!.userId,
      });
      created(res, s);
    } catch (err) {
      next(err);
    }
  },
);

sequencesRouter.post(
  "/:id/enqueue",
  validate(enqueueSchema),
  async (req, res, next) => {
    try {
      const r = await enqueueSequence(
        req.user!.agencySlug,
        req.params.id!,
        req.body.contactId,
      );
      ok(res, r);
    } catch (err) {
      next(err);
    }
  },
);

const activeSchema = z.object({ isActive: z.boolean() });

sequencesRouter.patch(
  "/:id",
  validate(activeSchema),
  async (req, res, next) => {
    try {
      const s = await setSequenceActive(
        req.user!.agencySlug,
        req.params.id!,
        req.body.isActive,
      );
      ok(res, s);
    } catch (err) {
      next(err);
    }
  },
);

sequencesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteSequence(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
