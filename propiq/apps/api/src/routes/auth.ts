import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { created, ok } from "../lib/response";
import {
  login,
  logout,
  refreshAccessToken,
  registerAgency,
} from "../services/auth";
import { SLUG_REGEX } from "../db/tenant";
import { prisma } from "../db/prisma";

export const authRouter = Router();

const registerSchema = z.object({
  agencyName: z.string().min(2).max(100),
  agencyNameAr: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(SLUG_REGEX, "Slug must be 3-40 chars: a-z, 0-9, underscore"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  language: z.enum(["EN", "AR"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

authRouter.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const result = await registerAgency(req.body);
    created(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", validate(refreshSchema), async (req, res, next) => {
  try {
    const result = await refreshAccessToken(req.body.refreshToken);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", validate(refreshSchema), async (req, res, next) => {
  try {
    await logout(req.body.refreshToken);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { agency: true },
    });
    if (!user) {
      return next(new Error("User not found"));
    }
    ok(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        firstNameAr: user.firstNameAr,
        lastNameAr: user.lastNameAr,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        language: user.language,
        agencyId: user.agencyId,
      },
      agency: {
        id: user.agency.id,
        name: user.agency.name,
        nameAr: user.agency.nameAr,
        slug: user.agency.slug,
        country: user.agency.country,
        city: user.agency.city,
        plan: user.agency.plan,
        logo: user.agency.logo,
        primaryColor: user.agency.primaryColor,
      },
    });
  } catch (err) {
    next(err);
  }
});
