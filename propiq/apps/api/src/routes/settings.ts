import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { ok, created } from "../lib/response";
import { Errors } from "../lib/errors";
import { isAllowedImageMime } from "../services/storage";
import {
  getAgencyProfile,
  getNotificationPrefs,
  getPortalSyncInfo,
  inviteAgent,
  listAgents,
  setAgentActive,
  setNotificationPrefs,
  updateAgencyProfile,
  updateAgentRole,
  uploadAgencyLogo,
} from "../services/settings";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireTenant);

const ADMIN_OR_MANAGER = ["SUPER_ADMIN", "AGENCY_ADMIN", "MANAGER"];
const ADMIN_ONLY = ["SUPER_ADMIN", "AGENCY_ADMIN"];

// ── Agency profile ──────────────────────────────────────────────────────────

settingsRouter.get("/agency", async (req, res, next) => {
  try {
    const a = await getAgencyProfile(req.user!.agencyId);
    ok(res, a);
  } catch (err) {
    next(err);
  }
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nameAr: z.string().max(100).nullable().optional(),
  licenseNumber: z.string().max(100).nullable().optional(),
  country: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color")
    .nullable()
    .optional(),
});

settingsRouter.patch(
  "/agency",
  requireRole(...ADMIN_ONLY),
  validate(profileUpdateSchema),
  async (req, res, next) => {
    try {
      const a = await updateAgencyProfile(req.user!.agencyId, req.body);
      ok(res, a);
    } catch (err) {
      next(err);
    }
  },
);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImageMime(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WebP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

settingsRouter.post(
  "/agency/logo",
  requireRole(...ADMIN_ONLY),
  logoUpload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) throw Errors.validation("Logo file required");
      const a = await uploadAgencyLogo(req.user!.agencyId, req.file);
      ok(res, a);
    } catch (err) {
      next(err);
    }
  },
);

// ── Team management ─────────────────────────────────────────────────────────

settingsRouter.get(
  "/team",
  requireRole(...ADMIN_OR_MANAGER),
  async (req, res, next) => {
    try {
      const agents = await listAgents(req.user!.agencyId);
      ok(res, agents);
    } catch (err) {
      next(err);
    }
  },
);

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["AGENT", "MANAGER"]),
});

settingsRouter.post(
  "/team/invite",
  requireRole(...ADMIN_ONLY),
  validate(inviteSchema),
  async (req, res, next) => {
    try {
      const r = await inviteAgent(req.user!.agencyId, req.body);
      created(res, r);
    } catch (err) {
      next(err);
    }
  },
);

const roleSchema = z.object({ role: z.enum(["AGENT", "MANAGER"]) });

settingsRouter.patch(
  "/team/:id/role",
  requireRole(...ADMIN_ONLY),
  validate(roleSchema),
  async (req, res, next) => {
    try {
      const u = await updateAgentRole(
        req.user!.agencyId,
        req.params.id!,
        req.body.role,
      );
      ok(res, u);
    } catch (err) {
      next(err);
    }
  },
);

const activeSchema = z.object({ isActive: z.boolean() });

settingsRouter.patch(
  "/team/:id/active",
  requireRole(...ADMIN_ONLY),
  validate(activeSchema),
  async (req, res, next) => {
    try {
      const u = await setAgentActive(
        req.user!.agencyId,
        req.params.id!,
        req.body.isActive,
      );
      ok(res, u);
    } catch (err) {
      next(err);
    }
  },
);

// ── Notification preferences (per-user) ─────────────────────────────────────

settingsRouter.get("/notifications", async (req, res, next) => {
  try {
    const p = await getNotificationPrefs(req.user!.userId);
    ok(res, p);
  } catch (err) {
    next(err);
  }
});

const prefsSchema = z.object({
  newLeadAssignedEmail: z.boolean().optional(),
  newLeadAssignedWhatsapp: z.boolean().optional(),
  dealStageChangeEmail: z.boolean().optional(),
  dealStageChangeWhatsapp: z.boolean().optional(),
  activityDueEmail: z.boolean().optional(),
  activityDueWhatsapp: z.boolean().optional(),
});

settingsRouter.patch(
  "/notifications",
  validate(prefsSchema),
  async (req, res, next) => {
    try {
      const p = await setNotificationPrefs(req.user!.userId, req.body);
      ok(res, p);
    } catch (err) {
      next(err);
    }
  },
);

// ── Portal sync info ────────────────────────────────────────────────────────

settingsRouter.get("/portals", async (req, res, next) => {
  try {
    const info = await getPortalSyncInfo(req.user!.agencySlug);
    ok(res, info);
  } catch (err) {
    next(err);
  }
});
