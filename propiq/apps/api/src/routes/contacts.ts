import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { created, ok } from "../lib/response";
import { Errors } from "../lib/errors";
import {
  createContact,
  deleteContact,
  exportContactsCsv,
  getContact,
  importContactsCsv,
  listContacts,
  updateContact,
} from "../services/contacts";

export const contactsRouter = Router();

contactsRouter.use(requireAuth, requireTenant);

const contactTypeEnum = z.enum([
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "INVESTOR",
]);

const pipelineTypeEnum = z.enum(["SALES", "LEASE"]);
const leadStatusEnum = z.enum(["ACTIVE", "DEAD", "WON", "LOST"]);

const baseFields = {
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).nullable().optional(),
  firstNameAr: z.string().max(100).nullable().optional(),
  lastNameAr: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().min(3).max(50),
  phoneAlt: z.string().max(50).nullable().optional(),
  nationality: z.string().max(50).nullable().optional(),
  contactType: contactTypeEnum.optional(),
  pipelineType: pipelineTypeEnum.optional(),
  source: z.string().max(50).nullable().optional(),
  sourceDetail: z.string().nullable().optional(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  preferredAreas: z.array(z.string()).optional(),
  bedroomsMin: z.number().int().nonnegative().nullable().optional(),
  bedroomsMax: z.number().int().nonnegative().nullable().optional(),
  propertyTypes: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  assignedTo: z.string().max(50).nullable().optional(),
};

const createSchema = z.object(baseFields);
const updateSchema = z
  .object({
    ...baseFields,
    firstName: baseFields.firstName.optional(),
    phone: baseFields.phone.optional(),
    isArchived: z.boolean().optional(),
  })
  .partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  contactType: contactTypeEnum.optional(),
  pipelineType: pipelineTypeEnum.optional(),
  status: leadStatusEnum.optional(),
  isArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

contactsRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await listContacts(req.user!.agencySlug, req.query);
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

contactsRouter.post(
  "/",
  validate(createSchema),
  async (req, res, next) => {
    try {
      const c = await createContact(req.user!.agencySlug, req.body);
      created(res, c);
    } catch (err) {
      next(err);
    }
  },
);

contactsRouter.get("/export.csv", async (req, res, next) => {
  try {
    const csv = await exportContactsCsv(req.user!.agencySlug);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

contactsRouter.post(
  "/import",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw Errors.validation("CSV file is required (field 'file')");
      const result = await importContactsCsv(
        req.user!.agencySlug,
        req.file.buffer,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

contactsRouter.get("/:id", async (req, res, next) => {
  try {
    const c = await getContact(req.user!.agencySlug, req.params.id!);
    ok(res, c);
  } catch (err) {
    next(err);
  }
});

contactsRouter.patch(
  "/:id",
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const c = await updateContact(
        req.user!.agencySlug,
        req.params.id!,
        req.body,
      );
      ok(res, c);
    } catch (err) {
      next(err);
    }
  },
);

contactsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteContact(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
