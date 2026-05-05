import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { created, ok } from "../lib/response";
import { Errors } from "../lib/errors";
import {
  addPropertyPhotos,
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  removePropertyPhoto,
  updateProperty,
} from "../services/properties";
import { isAllowedImageMime } from "../services/storage";

export const propertiesRouter = Router();

propertiesRouter.use(requireAuth, requireTenant);

const propertyTypeEnum = z.enum([
  "APARTMENT",
  "VILLA",
  "TOWNHOUSE",
  "PENTHOUSE",
  "OFFICE",
  "RETAIL",
  "WAREHOUSE",
  "LAND",
  "BUILDING",
]);
const listingTypeEnum = z.enum(["SALE", "RENT"]);
const statusEnum = z.enum([
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "RENTED",
  "OFF_MARKET",
]);
const furnishedEnum = z.enum(["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"]);

const baseFields = {
  referenceNo: z.string().max(50).nullable().optional(),
  title: z.string().min(2).max(255),
  titleAr: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  propertyType: propertyTypeEnum,
  listingType: listingTypeEnum.optional(),
  status: statusEnum.optional(),
  price: z.number().int().nonnegative().nullable().optional(),
  rentPrice: z.number().int().nonnegative().nullable().optional(),
  rentPeriod: z.string().max(20).nullable().optional(),
  currency: z.string().length(3).optional(),
  areaSqm: z.number().nonnegative().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  parkingSpaces: z.number().int().nonnegative().nullable().optional(),
  floorNumber: z.number().int().nullable().optional(),
  totalFloors: z.number().int().nonnegative().nullable().optional(),
  furnished: furnishedEnum.optional(),
  country: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).nullable().optional(),
  subArea: z.string().max(100).nullable().optional(),
  buildingName: z.string().max(200).nullable().optional(),
  unitNumber: z.string().max(50).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  ownerContactId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().max(50).nullable().optional(),
  isExclusive: z.boolean().optional(),
  exclusiveUntil: z.string().datetime().nullable().optional(),
};

const createSchema = z.object(baseFields);
const updateSchema = z
  .object({
    ...baseFields,
    title: baseFields.title.optional(),
    propertyType: baseFields.propertyType.optional(),
  })
  .partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: statusEnum.optional(),
  listingType: listingTypeEnum.optional(),
  propertyType: propertyTypeEnum.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

propertiesRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await listProperties(req.user!.agencySlug, req.query);
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

propertiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const p = await createProperty(req.user!.agencySlug, {
      ...req.body,
      createdBy: req.user!.userId,
    });
    created(res, p);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/:id", async (req, res, next) => {
  try {
    const p = await getProperty(req.user!.agencySlug, req.params.id!);
    ok(res, p);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.patch(
  "/:id",
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const p = await updateProperty(
        req.user!.agencySlug,
        req.params.id!,
        req.body,
      );
      ok(res, p);
    } catch (err) {
      next(err);
    }
  },
);

propertiesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteProperty(req.user!.agencySlug, req.params.id!);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImageMime(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WebP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

propertiesRouter.post(
  "/:id/photos",
  photoUpload.array("photos", 12),
  async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw Errors.validation("No photos uploaded");
      const p = await addPropertyPhotos(
        req.user!.agencySlug,
        req.params.id!,
        files,
      );
      created(res, p);
    } catch (err) {
      next(err);
    }
  },
);

const removePhotoSchema = z.object({ url: z.string().min(1) });

propertiesRouter.delete(
  "/:id/photos",
  validate(removePhotoSchema),
  async (req, res, next) => {
    try {
      const p = await removePropertyPhoto(
        req.user!.agencySlug,
        req.params.id!,
        req.body.url,
      );
      ok(res, p);
    } catch (err) {
      next(err);
    }
  },
);
