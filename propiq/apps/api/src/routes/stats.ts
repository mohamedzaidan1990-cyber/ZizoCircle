import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { ok } from "../lib/response";
import { getDashboardStats } from "../services/stats";

export const statsRouter = Router();

statsRouter.use(requireAuth, requireTenant);

statsRouter.get("/dashboard", async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.user!.agencySlug);
    ok(res, stats);
  } catch (err) {
    next(err);
  }
});
