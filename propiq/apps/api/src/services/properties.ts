import type {
  ListingType,
  Property,
  PropertyStatus,
  PropertyType,
  FurnishedStatus,
} from "@propiq/shared";
import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, buildUpdate, rowsToCamel, rowToCamel } from "../lib/sql";
import { storage } from "./storage";

export interface ListPropertiesParams {
  search?: string;
  status?: PropertyStatus;
  listingType?: ListingType;
  propertyType?: PropertyType;
  page?: number;
  limit?: number;
}

export interface CreatePropertyInput {
  referenceNo?: string | null;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  propertyType: PropertyType;
  listingType?: ListingType;
  status?: PropertyStatus;
  price?: number | null;
  rentPrice?: number | null;
  rentPeriod?: string | null;
  currency?: string;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  furnished?: FurnishedStatus;
  country?: string;
  city?: string;
  area?: string | null;
  subArea?: string | null;
  buildingName?: string | null;
  unitNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerContactId?: string | null;
  assignedTo?: string | null;
  isExclusive?: boolean;
  exclusiveUntil?: string | null;
  createdBy?: string | null;
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export async function listProperties(
  slug: string,
  params: ListPropertiesParams,
): Promise<{ items: Property[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(200, Math.max(1, params.limit ?? 24));
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.status) {
    filters.push(`status = $${i++}`);
    values.push(params.status);
  }
  if (params.listingType) {
    filters.push(`listing_type = $${i++}`);
    values.push(params.listingType);
  }
  if (params.propertyType) {
    filters.push(`property_type = $${i++}`);
    values.push(params.propertyType);
  }
  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    filters.push(
      `(title ILIKE $${i} OR title_ar ILIKE $${i} OR reference_no ILIKE $${i} OR area ILIKE $${i} OR sub_area ILIKE $${i} OR building_name ILIKE $${i})`,
    );
    values.push(term);
    i += 1;
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  return withTenant(slug, async (client) => {
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM properties ${where}`,
      values,
    );
    const itemsRes = await client.query(
      `SELECT * FROM properties ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset],
    );
    return {
      items: rowsToCamel<Property>(itemsRes.rows),
      total: totalRes.rows[0]?.count ?? 0,
      page,
      limit,
    };
  });
}

export async function getProperty(
  slug: string,
  id: string,
): Promise<Property> {
  const result = await withTenant(slug, (client) =>
    client.query(`SELECT * FROM properties WHERE id = $1`, [id]),
  );
  if (!result.rows[0]) throw Errors.notFound("Property not found");
  return rowToCamel<Property>(result.rows[0]);
}

export async function createProperty(
  slug: string,
  input: CreatePropertyInput,
): Promise<Property> {
  const data = {
    referenceNo: input.referenceNo ?? null,
    title: input.title,
    titleAr: input.titleAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    propertyType: input.propertyType,
    listingType: input.listingType ?? "SALE",
    status: input.status ?? "AVAILABLE",
    price: input.price ?? null,
    rentPrice: input.rentPrice ?? null,
    rentPeriod: input.rentPeriod ?? null,
    currency: input.currency ?? "QAR",
    areaSqm: input.areaSqm ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    parkingSpaces: input.parkingSpaces ?? null,
    floorNumber: input.floorNumber ?? null,
    totalFloors: input.totalFloors ?? null,
    furnished: input.furnished ?? "UNFURNISHED",
    country: input.country ?? "Qatar",
    city: input.city ?? "Doha",
    area: input.area ?? null,
    subArea: input.subArea ?? null,
    buildingName: input.buildingName ?? null,
    unitNumber: input.unitNumber ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    photos: [] as string[],
    ownerContactId: input.ownerContactId ?? null,
    assignedTo: input.assignedTo ?? null,
    isExclusive: input.isExclusive ?? false,
    exclusiveUntil: input.exclusiveUntil ?? null,
    createdBy: input.createdBy ?? null,
  };
  const { columns, placeholders, values } = buildInsert(data);
  const result = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO properties (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    ),
  );
  return rowToCamel<Property>(result.rows[0]);
}

export async function updateProperty(
  slug: string,
  id: string,
  input: UpdatePropertyInput,
): Promise<Property> {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    normalized[k] = v;
  }
  if (Object.keys(normalized).length === 0) {
    return getProperty(slug, id);
  }
  normalized.updatedAt = new Date();

  const { clause, values } = buildUpdate(normalized);
  const result = await withTenant(slug, (client) =>
    client.query(
      `UPDATE properties SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    ),
  );
  if (!result.rows[0]) throw Errors.notFound("Property not found");
  return rowToCamel<Property>(result.rows[0]);
}

export async function deleteProperty(slug: string, id: string): Promise<void> {
  // Remove any uploaded photos along with the row.
  const existing = await withTenant(slug, (client) =>
    client.query(`SELECT photos FROM properties WHERE id = $1`, [id]),
  );
  const photos = (existing.rows[0]?.photos ?? []) as string[];
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM properties WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Property not found");
  await Promise.all(photos.map((url) => storage().remove(url)));
}

export async function addPropertyPhotos(
  slug: string,
  id: string,
  files: Array<{ originalname: string; mimetype: string; buffer: Buffer }>,
): Promise<Property> {
  if (files.length === 0) throw Errors.validation("No photos uploaded");
  const urls = await Promise.all(
    files.map((f) => storage().save(`properties/${id}`, f.originalname, f.mimetype, f.buffer)),
  );
  const result = await withTenant(slug, (client) =>
    client.query(
      `UPDATE properties
         SET photos = COALESCE(photos, '{}') || $1::text[],
             updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [urls, id],
    ),
  );
  if (!result.rows[0]) {
    // Roll back files we just wrote since the row no longer exists.
    await Promise.all(urls.map((u) => storage().remove(u)));
    throw Errors.notFound("Property not found");
  }
  return rowToCamel<Property>(result.rows[0]);
}

export async function removePropertyPhoto(
  slug: string,
  id: string,
  photoUrl: string,
): Promise<Property> {
  const result = await withTenant(slug, (client) =>
    client.query(
      `UPDATE properties
         SET photos = array_remove(photos, $1),
             updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [photoUrl, id],
    ),
  );
  if (!result.rows[0]) throw Errors.notFound("Property not found");
  await storage().remove(photoUrl);
  return rowToCamel<Property>(result.rows[0]);
}
