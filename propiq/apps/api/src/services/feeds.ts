import type { Property } from "@propiq/shared";
import { withTenant } from "../db/tenant";
import { rowsToCamel } from "../lib/sql";
import { Errors } from "../lib/errors";

const PUBLISHABLE_STATUSES = ["AVAILABLE", "RESERVED"];

function escapeXml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string | null | undefined): string {
  if (s == null) return "<![CDATA[]]>";
  // Wrap in CDATA, but split any existing "]]>" sequences to avoid breaking out.
  return `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

async function publishableProperties(
  slug: string,
  agencyName: string,
): Promise<{ agencyName: string; items: Property[] }> {
  const result = await withTenant(slug, (client) =>
    client.query(
      `SELECT * FROM properties WHERE status = ANY($1) ORDER BY updated_at DESC LIMIT 5000`,
      [PUBLISHABLE_STATUSES],
    ),
  );
  return {
    agencyName,
    items: rowsToCamel<Property>(result.rows),
  };
}

async function getAgencyContext(slug: string): Promise<{ agencyName: string }> {
  // The Agency row lives in public schema, but we don't import Prisma into the
  // services layer; the route resolves it. For raw use we just pass it through.
  // This stub exists so the feed services can be called from a single place.
  if (!slug) throw Errors.notFound("Agency slug required");
  return { agencyName: slug };
}

// ── Bayut feed ──────────────────────────────────────────────────────────────

export async function buildBayutFeed(
  slug: string,
  agencyName: string,
  baseUrl: string,
): Promise<string> {
  const { items } = await publishableProperties(slug, agencyName);

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<list>",
  ];
  for (const p of items) {
    const offering = p.listingType === "RENT" ? "rent" : "sale";
    const price = p.listingType === "RENT" ? p.rentPrice : p.price;
    lines.push("  <property>");
    lines.push(`    <reference_number>${escapeXml(p.referenceNo ?? p.id)}</reference_number>`);
    lines.push(`    <title_en>${cdata(p.title)}</title_en>`);
    if (p.titleAr) lines.push(`    <title_ar>${cdata(p.titleAr)}</title_ar>`);
    lines.push(`    <description_en>${cdata(p.description)}</description_en>`);
    if (p.descriptionAr)
      lines.push(`    <description_ar>${cdata(p.descriptionAr)}</description_ar>`);
    lines.push(`    <property_type>${escapeXml(p.propertyType)}</property_type>`);
    lines.push(`    <offering_type>${escapeXml(offering)}</offering_type>`);
    lines.push(`    <price>${price ?? 0}</price>`);
    lines.push(`    <currency>${escapeXml(p.currency)}</currency>`);
    if (p.listingType === "RENT" && p.rentPeriod) {
      lines.push(`    <rent_frequency>${escapeXml(p.rentPeriod)}</rent_frequency>`);
    }
    lines.push(`    <bedrooms>${p.bedrooms ?? 0}</bedrooms>`);
    lines.push(`    <bathrooms>${p.bathrooms ?? 0}</bathrooms>`);
    if (p.areaSqm) lines.push(`    <size>${p.areaSqm}</size>`);
    if (p.parkingSpaces != null)
      lines.push(`    <parking>${p.parkingSpaces}</parking>`);
    if (p.furnished) lines.push(`    <furnished>${escapeXml(p.furnished)}</furnished>`);
    lines.push(`    <city>${escapeXml(p.city)}</city>`);
    if (p.area) lines.push(`    <community>${escapeXml(p.area)}</community>`);
    if (p.subArea) lines.push(`    <sub_community>${escapeXml(p.subArea)}</sub_community>`);
    if (p.buildingName) lines.push(`    <tower_name>${escapeXml(p.buildingName)}</tower_name>`);
    if (p.latitude != null && p.longitude != null) {
      lines.push(`    <geopoints>${p.latitude},${p.longitude}</geopoints>`);
    }
    if (p.photos.length > 0) {
      lines.push("    <images>");
      p.photos.slice(0, 30).forEach((url, idx) => {
        const absolute = url.startsWith("http") ? url : `${baseUrl}${url}`;
        lines.push(
          `      <image order="${idx + 1}">${escapeXml(absolute)}</image>`,
        );
      });
      lines.push("    </images>");
    }
    lines.push(`    <agent_name>${escapeXml(agencyName)}</agent_name>`);
    lines.push(`    <last_update>${new Date(p.updatedAt).toISOString()}</last_update>`);
    lines.push("  </property>");
  }
  lines.push("</list>");
  return lines.join("\n");
}

// ── Property Finder feed ────────────────────────────────────────────────────

export async function buildPropertyFinderFeed(
  slug: string,
  agencyName: string,
  baseUrl: string,
): Promise<string> {
  const { items } = await publishableProperties(slug, agencyName);

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<properties exported="${new Date().toISOString()}">`,
  ];
  for (const p of items) {
    const offering = p.listingType === "RENT" ? "RR" : "RS";
    const price = p.listingType === "RENT" ? p.rentPrice : p.price;
    lines.push(`  <property id="${escapeXml(p.id)}">`);
    lines.push(`    <reference_number>${escapeXml(p.referenceNo ?? p.id)}</reference_number>`);
    lines.push(`    <title>${cdata(p.title)}</title>`);
    if (p.titleAr) lines.push(`    <title_ar>${cdata(p.titleAr)}</title_ar>`);
    lines.push(`    <description>${cdata(p.description)}</description>`);
    if (p.descriptionAr)
      lines.push(`    <description_ar>${cdata(p.descriptionAr)}</description_ar>`);
    lines.push(`    <category>${escapeXml(p.propertyType)}</category>`);
    lines.push(`    <offering_type>${offering}</offering_type>`);
    lines.push(`    <price currency="${escapeXml(p.currency)}">${price ?? 0}</price>`);
    if (p.listingType === "RENT" && p.rentPeriod) {
      lines.push(`    <price_period>${escapeXml(p.rentPeriod)}</price_period>`);
    }
    lines.push(`    <bedroom>${p.bedrooms ?? 0}</bedroom>`);
    lines.push(`    <bathroom>${p.bathrooms ?? 0}</bathroom>`);
    if (p.areaSqm) lines.push(`    <size unit="sqm">${p.areaSqm}</size>`);
    if (p.parkingSpaces != null)
      lines.push(`    <parking>${p.parkingSpaces}</parking>`);
    if (p.furnished) lines.push(`    <furnished>${escapeXml(p.furnished)}</furnished>`);
    lines.push("    <location>");
    lines.push(`      <country>${escapeXml(p.country)}</country>`);
    lines.push(`      <city>${escapeXml(p.city)}</city>`);
    if (p.area) lines.push(`      <community>${escapeXml(p.area)}</community>`);
    if (p.subArea) lines.push(`      <sub_community>${escapeXml(p.subArea)}</sub_community>`);
    if (p.buildingName) lines.push(`      <tower>${escapeXml(p.buildingName)}</tower>`);
    if (p.latitude != null && p.longitude != null) {
      lines.push(`      <latitude>${p.latitude}</latitude>`);
      lines.push(`      <longitude>${p.longitude}</longitude>`);
    }
    lines.push("    </location>");
    if (p.photos.length > 0) {
      lines.push("    <photos>");
      p.photos.slice(0, 30).forEach((url) => {
        const absolute = url.startsWith("http") ? url : `${baseUrl}${url}`;
        lines.push(`      <photo>${escapeXml(absolute)}</photo>`);
      });
      lines.push("    </photos>");
    }
    lines.push(`    <agent>${escapeXml(agencyName)}</agent>`);
    lines.push(`    <updated_at>${new Date(p.updatedAt).toISOString()}</updated_at>`);
    lines.push("  </property>");
  }
  lines.push("</properties>");
  return lines.join("\n");
}

export { getAgencyContext };
