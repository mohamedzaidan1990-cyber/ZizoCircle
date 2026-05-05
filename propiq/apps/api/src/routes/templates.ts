import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { ok, created } from "../lib/response";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
} from "../services/templates";

export const templatesRouter = Router();
templatesRouter.use(requireAuth, requireTenant);

const channelEnum = z.enum(["EMAIL", "WHATSAPP", "SMS"]);

const listSchema = z.object({ channel: channelEnum.optional() });

const createSchema = z.object({
  name: z.string().min(1).max(255),
  channel: channelEnum,
  subject: z.string().max(255).nullable().optional(),
  bodyEn: z.string().min(1),
  bodyAr: z.string().nullable().optional(),
  variables: z.array(z.string()).optional(),
});

templatesRouter.get(
  "/",
  validate(listSchema, "query"),
  async (req, res, next) => {
    try {
      const items = await listTemplates(
        req.user!.agencySlug,
        (req.query as { channel?: "EMAIL" | "WHATSAPP" | "SMS" }).channel,
      );
      ok(res, items);
    } catch (err) {
      next(err);
    }
  },
);

templatesRouter.post(
  "/",
  validate(createSchema),
  async (req, res, next) => {
    try {
      const t = await createTemplate(req.user!.agencySlug, {
        ...req.body,
        createdBy: req.user!.userId,
      });
      created(res, t);
    } catch (err) {
      next(err);
    }
  },
);

templatesRouter.get("/:id", async (req, res, next) => {
  try {
    const t = await getTemplate(req.user!.agencySlug, req.params.id!);
    ok(res, t);
  } catch (err) {
    next(err);
  }
});

templatesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteTemplate(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
