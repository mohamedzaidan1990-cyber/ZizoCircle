import type { Property } from "@propiq/shared";
import { anthropic, CLAUDE_MODEL, extractText } from "../anthropic";
import { getProperty, updateProperty } from "../properties";
import { Errors } from "../../lib/errors";
import { factCheckListing, describeIssues } from "./guardrails";

export interface ListingContent {
  description_en: string;
  description_ar: string;
  highlights_en: string[];
  highlights_ar: string[];
  meta_description_en: string;
  meta_description_ar: string;
}

const SYSTEM = `You are a senior real-estate copywriter for an agency in Doha, Qatar.

You write listing copy in BOTH English and Modern Standard Arabic for the same property. You know the local context: The Pearl, Lusail, West Bay, Al Sadd, Mushaireb, etc. Buyers and tenants here come from the GCC, the wider region, and Western expat communities.

You receive a property's structured fields (type, bedrooms, area, location, listing type, price). You return ONE JSON object matching:

{
  "description_en": "120-180 words. Vivid, sensory, specific. Lead with what's most special. Mention area, view, layout, finish quality, lifestyle fit. No clichés ('stunning', 'must-see'). No fake urgency.",
  "description_ar": "Same property, written natively in Modern Standard Arabic — NOT a translation. 120-180 words. Same depth, locally idiomatic.",
  "highlights_en": ["6-10 short bullet phrases — each 4-8 words. Specific facts, not adjectives."],
  "highlights_ar": ["Same as highlights_en, written natively in Arabic."],
  "meta_description_en": "150-160 char SEO meta description in English.",
  "meta_description_ar": "150-160 char SEO meta description in Arabic."
}

Constraints:
- Don't invent amenities the input doesn't mention. If the input has bedrooms=2, don't say "spacious 3-bedroom".
- For SALE listings, frame as ownership/investment. For RENT listings, frame as lifestyle/move-in.
- No emoji. No markdown. No surrounding prose. Just the JSON.`;

export async function generateListingContent(
  slug: string,
  propertyId: string,
): Promise<ListingContent> {
  const property = await getProperty(slug, propertyId);
  return generateListingContentForFacts(property);
}

export async function generateListingContentForFacts(
  property: Property,
): Promise<ListingContent> {
  const facts = {
    title: property.title,
    titleAr: property.titleAr,
    propertyType: property.propertyType,
    listingType: property.listingType,
    status: property.status,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpaces: property.parkingSpaces,
    areaSqm: property.areaSqm,
    floorNumber: property.floorNumber,
    totalFloors: property.totalFloors,
    furnished: property.furnished,
    price: property.price,
    rentPrice: property.rentPrice,
    rentPeriod: property.rentPeriod,
    currency: property.currency,
    country: property.country,
    city: property.city,
    area: property.area,
    subArea: property.subArea,
    buildingName: property.buildingName,
    isExclusive: property.isExclusive,
    existingDescriptionEn: property.description,
    existingDescriptionAr: property.descriptionAr,
  };

  const client = anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2500,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Property facts:\n\n${JSON.stringify(facts, null, 2)}\n\nWrite the listing.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Partial<ListingContent>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.ai("AI returned non-JSON listing content");
  }

  if (
    !parsed.description_en ||
    !parsed.description_ar ||
    !Array.isArray(parsed.highlights_en) ||
    !Array.isArray(parsed.highlights_ar) ||
    !parsed.meta_description_en ||
    !parsed.meta_description_ar
  ) {
    throw Errors.ai("AI returned incomplete listing content");
  }

  const result: ListingContent = {
    description_en: String(parsed.description_en).trim(),
    description_ar: String(parsed.description_ar).trim(),
    highlights_en: parsed.highlights_en.map(String).slice(0, 12),
    highlights_ar: parsed.highlights_ar.map(String).slice(0, 12),
    meta_description_en: String(parsed.meta_description_en).trim().slice(0, 200),
    meta_description_ar: String(parsed.meta_description_ar).trim().slice(0, 200),
  };

  // Guardrail: numeric claims in the EN copy (bedrooms, bathrooms, parking,
  // area, price) must match the property's structured fields.
  const englishCopy = [
    result.description_en,
    result.meta_description_en,
    result.highlights_en.join(" | "),
  ].join("\n");
  const factCheckSubject: Parameters<typeof factCheckListing>[1] = {
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? null,
    parkingSpaces: property.parkingSpaces ?? null,
    areaSqm: property.areaSqm == null ? null : Number(property.areaSqm),
    price: property.price ?? null,
    rentPrice: property.rentPrice ?? null,
    currency: property.currency ?? null,
  };
  const issues = factCheckListing(englishCopy, factCheckSubject);
  if (issues.length > 0) {
    throw Errors.ai(
      `Listing copy contained ${issues.length} fact mismatch(es): ${describeIssues(issues)}. Regenerate or edit before publishing.`,
    );
  }

  return result;
}

export async function applyListingContent(
  slug: string,
  propertyId: string,
  content: ListingContent,
): Promise<Property> {
  return updateProperty(slug, propertyId, {
    description: content.description_en,
    descriptionAr: content.description_ar,
  });
}
