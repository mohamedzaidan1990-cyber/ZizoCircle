import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { withTenant, assertSafeSlug } from "../db/tenant";
import { env } from "../lib/env";
import { Errors } from "../lib/errors";
import { ok } from "../lib/response";

export const propifyRouter = Router();

// ────────────────────────────────────────────────────────────────────────────
// POST /api/propify/claude — Anthropic proxy for the static demo HTML.
// Public, but rate-limited AND body-validated to prevent quota abuse: the
// allow-listed shape rejects tools, file refs, oversized prompts, and any
// model outside the Propify-supported family.
// ────────────────────────────────────────────────────────────────────────────
const claudeProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const PROPIFY_ALLOWED_MODELS = new Set<string>([
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
]);
const PROPIFY_MAX_TOKENS_CAP = 2000;
const PROPIFY_MAX_CONTENT_CHARS = 50_000;

const proxyMessageContent = z.union([
  z.string().max(PROPIFY_MAX_CONTENT_CHARS),
  z
    .array(
      z.object({
        type: z.literal("text"),
        text: z.string().max(PROPIFY_MAX_CONTENT_CHARS),
      }),
    )
    .max(20),
]);

const claudeProxyBody = z
  .object({
    model: z.string().refine(
      (m) => PROPIFY_ALLOWED_MODELS.has(m),
      `model must be one of ${[...PROPIFY_ALLOWED_MODELS].join(", ")}`,
    ),
    max_tokens: z
      .number()
      .int()
      .positive()
      .max(PROPIFY_MAX_TOKENS_CAP, `max_tokens must be ≤ ${PROPIFY_MAX_TOKENS_CAP}`),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: proxyMessageContent,
        }),
      )
      .min(1)
      .max(40),
    system: z.string().max(PROPIFY_MAX_CONTENT_CHARS).optional(),
    temperature: z.number().min(0).max(1).optional(),
    top_p: z.number().min(0).max(1).optional(),
    stop_sequences: z.array(z.string().max(64)).max(8).optional(),
    stream: z.boolean().optional(),
  })
  .strict();

propifyRouter.post(
  "/claude",
  claudeProxyLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!env.ANTHROPIC_API_KEY) {
      return next(Errors.internal("ANTHROPIC_API_KEY not configured"));
    }

    const parsed = claudeProxyBody.safeParse(req.body);
    if (!parsed.success) {
      return next(
        Errors.validation(
          "Invalid Claude proxy payload",
          parsed.error.flatten(),
        ),
      );
    }

    // Cap the total prompt size in characters as a second line of defence
    // against quota burn (long-context attacks).
    const totalChars = (() => {
      let n = (parsed.data.system ?? "").length;
      for (const m of parsed.data.messages) {
        n += typeof m.content === "string"
          ? m.content.length
          : m.content.reduce((s, c) => s + c.text.length, 0);
      }
      return n;
    })();
    if (totalChars > PROPIFY_MAX_CONTENT_CHARS) {
      return next(
        Errors.validation(
          `Prompt too long: ${totalChars} chars exceeds cap of ${PROPIFY_MAX_CONTENT_CHARS}`,
        ),
      );
    }

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(parsed.data),
      });
      const body = await upstream.text();
      res.status(upstream.status).type("application/json").send(body);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[propify] Claude proxy error", err);
      next(Errors.ai("Claude proxy request failed"));
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/propify/lead — Inbound webhook from the Propify WhatsApp backend.
// Authenticated via shared secret, NOT JWT (the backend has no user context).
// ────────────────────────────────────────────────────────────────────────────
const leadSchema = z.object({
  tenant_slug: z.string().regex(/^[a-z0-9_]{3,40}$/),
  agent_id: z.string().nullish(),
  phone: z.string().min(5).max(50),
  property_ref: z.string().max(50).optional().nullable(),
  property_name: z.string().max(255).optional().nullable(),
  score: z.number().int().min(0).max(100),
  tier: z.enum(["hot", "warm", "cold", "dead"]),
  qualifiers: z
    .object({
      q1: z.boolean().optional(),
      q2: z.boolean().optional(),
      q3: z.boolean().optional(),
      q4: z.boolean().optional(),
      q5: z.boolean().optional(),
    })
    .default({}),
  conversation_summary: z.string().max(8000).optional().nullable(),
  source: z.string().max(50).default("property_finder"),
});

function requirePropifySecret(req: Request, _res: Response, next: NextFunction) {
  const expected = process.env.PROPIFY_WEBHOOK_SECRET;
  if (!expected) {
    return next(Errors.internal("PROPIFY_WEBHOOK_SECRET not configured"));
  }
  const header = req.headers.authorization;
  if (header !== `Bearer ${expected}`) {
    return next(Errors.unauthorized("Invalid Propify webhook secret"));
  }
  next();
}

propifyRouter.post(
  "/lead",
  requirePropifySecret,
  validate(leadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const lead = req.body as z.infer<typeof leadSchema>;
    try {
      assertSafeSlug(lead.tenant_slug);

      const qualifierSummary = [
        lead.qualifiers.q1 && "budget confirmed",
        lead.qualifiers.q2 && "timeline clear",
        lead.qualifiers.q3 && "decision maker",
        lead.qualifiers.q4 && "financing ready",
        lead.qualifiers.q5 && "serious intent",
      ]
        .filter(Boolean)
        .join(", ");

      const tierUpper = lead.tier.toUpperCase();
      const propifyStatus = lead.tier === "dead" ? "ARCHIVED" : "NEW";
      const isArchived = lead.tier === "dead";

      const contactId = await withTenant(lead.tenant_slug, async (client) => {
        const insert = await client.query(
          `
          INSERT INTO contacts (
            first_name, phone, source, ai_score, ai_score_reason, ai_tier,
            ai_qualifiers, ai_scored_at, conversation_summary, propify_status,
            property_ref, property_name, assigned_to, is_archived, notes
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7::jsonb, NOW(), $8, $9,
            $10, $11, $12, $13, $14
          )
          RETURNING id
          `,
          [
            // Use the masked phone tail as a placeholder first name. Agent edits later.
            `Lead ${lead.phone.slice(-4)}`,
            lead.phone,
            lead.source,
            lead.score,
            `[${tierUpper}] ${qualifierSummary}`,
            lead.tier,
            JSON.stringify(lead.qualifiers),
            lead.conversation_summary ?? null,
            propifyStatus,
            lead.property_ref ?? null,
            lead.property_name ?? null,
            lead.agent_id ?? null,
            isArchived,
            lead.conversation_summary ?? null,
          ],
        );
        const id = insert.rows[0]?.id as string | undefined;
        if (!id) throw Errors.internal("Failed to insert contact");

        if (lead.tier === "hot" || lead.tier === "warm") {
          await client.query(
            `
            INSERT INTO deals (
              contact_id, title, deal_type, stage, priority, source, notes
            )
            VALUES ($1, $2, 'SALE', 'NEW_LEAD', $3, $4, $5)
            `,
            [
              id,
              `${lead.property_name ?? lead.property_ref ?? "Inbound lead"} — Score ${lead.score}`,
              lead.tier === "hot" ? "high" : "medium",
              lead.source,
              lead.conversation_summary ?? null,
            ],
          );
        }

        return id;
      });

      ok(res, { contact_id: contactId }, undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/propify/leads — Authenticated list, scoped to the caller's tenant.
// Used by the PropIQ web app's leads page.
// ────────────────────────────────────────────────────────────────────────────
const leadsQuerySchema = z.object({
  tier: z.enum(["hot", "warm", "cold", "dead"]).optional(),
  agent_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const tierEnum = z.enum(["hot", "warm", "cold", "dead"]);

const leadUpdateSchema = z
  .object({
    ai_tier: tierEnum.optional(),
    assigned_to: z.string().max(50).nullable().optional(),
    propify_status: z.enum(["NEW", "ARCHIVED"]).optional(),
  })
  .refine(
    (b) =>
      b.ai_tier !== undefined ||
      b.assigned_to !== undefined ||
      b.propify_status !== undefined,
    { message: "At least one field must be provided" },
  );

propifyRouter.patch(
  "/leads/:id",
  requireAuth,
  validate(leadUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.user!.agencySlug;
      const id = req.params.id!;
      // UUID guard — :id is interpolated as a parameter but we still want a
      // 400 (not a Postgres error) for malformed input.
      if (!/^[0-9a-f-]{32,36}$/i.test(id)) {
        return next(Errors.validation("Invalid contact id"));
      }
      const body = req.body as z.infer<typeof leadUpdateSchema>;

      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (body.ai_tier !== undefined) {
        sets.push(`ai_tier = $${idx++}`);
        params.push(body.ai_tier);
        // Also flip is_archived to follow the tier — "dead" archives.
        sets.push(`is_archived = $${idx++}`);
        params.push(body.ai_tier === "dead");
      }
      if (body.assigned_to !== undefined) {
        sets.push(`assigned_to = $${idx++}`);
        params.push(body.assigned_to);
      }
      if (body.propify_status !== undefined) {
        sets.push(`propify_status = $${idx++}`);
        params.push(body.propify_status);
      }
      sets.push(`updated_at = NOW()`);

      const updated = await withTenant(slug, (client) =>
        client.query(
          `UPDATE contacts SET ${sets.join(", ")} WHERE id = $${idx}
           RETURNING id, ai_tier, assigned_to, propify_status, is_archived`,
          [...params, id],
        ),
      );

      if (updated.rowCount === 0) {
        return next(Errors.notFound("Lead not found"));
      }
      ok(res, updated.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

propifyRouter.get(
  "/leads",
  requireAuth,
  validate(leadsQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.user!.agencySlug;
      const { tier, agent_id, limit } = req.query as unknown as z.infer<
        typeof leadsQuerySchema
      >;

      const rows = await withTenant(slug, async (client) => {
        const where: string[] = ["is_archived = FALSE"];
        const params: unknown[] = [];
        let idx = 1;

        if (tier) {
          where.push(`ai_tier = $${idx++}`);
          params.push(tier);
        }
        if (agent_id) {
          where.push(`assigned_to = $${idx++}`);
          params.push(agent_id);
        }

        const limitParam = `$${idx}`;
        params.push(limit);

        const result = await client.query(
          `
          SELECT id, phone, source, ai_score, ai_score_reason, ai_tier,
                 ai_qualifiers, conversation_summary, propify_status,
                 property_ref, property_name, assigned_to, created_at
          FROM contacts
          WHERE ${where.join(" AND ")}
          ORDER BY ai_score DESC NULLS LAST, created_at DESC
          LIMIT ${limitParam}
          `,
          params,
        );
        return result.rows;
      });

      const counts = {
        hot: 0,
        warm: 0,
        cold: 0,
        dead: 0,
      };
      for (const row of rows) {
        const t = row.ai_tier as keyof typeof counts | null;
        if (t && t in counts) counts[t]++;
      }

      ok(res, { leads: rows, counts }, { total: rows.length, page: 1, limit });
    } catch (err) {
      next(err);
    }
  },
);
