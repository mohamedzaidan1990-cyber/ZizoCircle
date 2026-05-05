import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { ok } from "../lib/response";
import {
  getAvgDaysPerStage,
  getFunnel,
  getLeadsBySource,
  getMonthlyDealVolume,
  getRevenueByAgent,
} from "../services/reports";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireTenant);

const rangeEnum = z.enum([
  "this_month",
  "last_3_months",
  "last_12_months",
  "all_time",
]);

const rangeQuerySchema = z.object({
  range: rangeEnum.optional().default("last_3_months"),
});

reportsRouter.get(
  "/funnel",
  validate(rangeQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const data = await getFunnel(
        req.user!.agencySlug,
        (req.query as { range: "this_month" | "last_3_months" | "last_12_months" | "all_time" }).range,
      );
      ok(res, data);
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get("/revenue-by-agent", async (req, res, next) => {
  try {
    const data = await getRevenueByAgent(
      req.user!.agencySlug,
      req.user!.agencyId,
    );
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get(
  "/leads-by-source",
  validate(rangeQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const data = await getLeadsBySource(
        req.user!.agencySlug,
        (req.query as { range: "this_month" | "last_3_months" | "last_12_months" | "all_time" }).range,
      );
      ok(res, data);
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get("/monthly-deal-volume", async (req, res, next) => {
  try {
    const data = await getMonthlyDealVolume(req.user!.agencySlug);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get(
  "/avg-days-per-stage",
  validate(rangeQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const data = await getAvgDaysPerStage(
        req.user!.agencySlug,
        (req.query as { range: "this_month" | "last_3_months" | "last_12_months" | "all_time" }).range,
      );
      ok(res, data);
    } catch (err) {
      next(err);
    }
  },
);
