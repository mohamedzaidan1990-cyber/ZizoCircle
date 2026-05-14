// Hallucination guardrails for AI-generated copy. Prompts already tell the
// model not to invent facts; this layer enforces it by extracting numeric
// claims from the output and checking them against the source facts. English
// only — Arabic uses native script/numerals and is handled by the prompt-
// level constraint plus human review.

export interface FactCheckIssue {
  field: string;
  claim: string;
  expected: string;
}

interface ListingFacts {
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  areaSqm?: number | null;
  price?: number | null;
  rentPrice?: number | null;
  currency?: string | null;
}

/**
 * Verifies that numeric claims in `text` are consistent with the property's
 * `facts`. Only checks claims the model actually makes — silence is fine.
 *
 * Tolerances:
 *   bedrooms / bathrooms / parking — exact match
 *   areaSqm — within ±5%
 *   price / rentPrice — within ±10%
 */
export function factCheckListing(
  text: string,
  facts: ListingFacts,
): FactCheckIssue[] {
  const issues: FactCheckIssue[] = [];

  // Bedrooms — match "3-bedroom", "3 bedroom", "3 BR", "3-bed", "three-bedroom".
  if (facts.bedrooms != null) {
    const numericClaims = [
      ...text.matchAll(/(\d+)\s*[-\s]?\s*(?:bed(?:room)?s?|br)\b/gi),
    ];
    for (const m of numericClaims) {
      const claimed = Number(m[1]);
      if (Number.isFinite(claimed) && claimed !== facts.bedrooms) {
        issues.push({
          field: "bedrooms",
          claim: m[0],
          expected: `${facts.bedrooms} bedroom${facts.bedrooms === 1 ? "" : "s"}`,
        });
      }
    }
  }

  // Bathrooms — match "2-bathroom", "2 bath", "2 BA".
  if (facts.bathrooms != null) {
    const claims = [
      ...text.matchAll(/(\d+)\s*[-\s]?\s*(?:bath(?:room)?s?|ba)\b/gi),
    ];
    for (const m of claims) {
      const claimed = Number(m[1]);
      if (Number.isFinite(claimed) && claimed !== facts.bathrooms) {
        issues.push({
          field: "bathrooms",
          claim: m[0],
          expected: `${facts.bathrooms} bathroom${facts.bathrooms === 1 ? "" : "s"}`,
        });
      }
    }
  }

  // Parking — match "2-car parking", "2 parking spaces".
  if (facts.parkingSpaces != null && facts.parkingSpaces > 0) {
    const claims = [
      ...text.matchAll(/(\d+)\s*(?:[-\s]car)?\s*parking\b/gi),
    ];
    for (const m of claims) {
      const claimed = Number(m[1]);
      if (Number.isFinite(claimed) && claimed !== facts.parkingSpaces) {
        issues.push({
          field: "parking",
          claim: m[0],
          expected: `${facts.parkingSpaces} parking space${facts.parkingSpaces === 1 ? "" : "s"}`,
        });
      }
    }
  }

  // Area in sqm — match "120 sqm", "120 sq m", "120 m²", "120m2".
  if (facts.areaSqm != null) {
    const factSqm = Number(facts.areaSqm);
    if (factSqm > 0) {
      const claims = [
        ...text.matchAll(/(\d{2,5})\s*(?:sq\.?\s?m|m²|sqm|m2)\b/gi),
      ];
      for (const m of claims) {
        const claimed = Number(m[1]);
        const diff = Math.abs(claimed - factSqm) / factSqm;
        if (diff > 0.05) {
          issues.push({
            field: "areaSqm",
            claim: m[0],
            expected: `${Math.round(factSqm)} sqm`,
          });
        }
      }
    }
  }

  // Price — match "QAR 2,500,000", "AED 2.5M", "USD 2.5 million", "2,500,000".
  // Only flag if the number is in the same order of magnitude as the fact —
  // an unrelated number like a year or unit count shouldn't trip this.
  const priceFact = facts.price ?? facts.rentPrice ?? null;
  if (priceFact != null && priceFact > 0) {
    const numericPriceRe = /(?:(?:QAR|AED|USD|SAR|EUR|GBP)\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})(?:\.(\d+))?\s*(?:(M|K|million|thousand|m|k)\b)?/gi;
    for (const m of text.matchAll(numericPriceRe)) {
      let n = Number(m[1].replace(/,/g, ""));
      if (m[2]) n += Number(`0.${m[2]}`);
      const unit = (m[3] ?? "").toLowerCase();
      if (unit === "m" || unit === "million") n *= 1_000_000;
      else if (unit === "k" || unit === "thousand") n *= 1_000;
      if (!Number.isFinite(n) || n <= 0) continue;

      // Skip values an order of magnitude or more off — those are unrelated
      // numbers in the copy (e.g. unit numbers, years).
      const ratio = n / priceFact;
      if (ratio < 0.5 || ratio > 2) continue;

      const diff = Math.abs(n - priceFact) / priceFact;
      if (diff > 0.1) {
        issues.push({
          field: facts.price ? "price" : "rentPrice",
          claim: m[0].trim(),
          expected: `${facts.currency ?? "QAR"} ${priceFact.toLocaleString()}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Verifies that a message generated for a contact doesn't quote that
 * contact's confidential budget figures. Returns issues when a number in
 * `text` lands within ±10% of either budget bound.
 */
export function detectBudgetLeakage(
  text: string,
  budget: { min?: number | null; max?: number | null } | null,
): FactCheckIssue[] {
  if (!budget) return [];
  const bounds = [budget.min, budget.max].filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  if (bounds.length === 0) return [];

  const issues: FactCheckIssue[] = [];
  const numRe = /\b(\d{1,3}(?:,\d{3})+|\d{4,})(?:\.(\d+))?\s*(M|K|million|thousand|m|k)?\b/gi;
  for (const m of text.matchAll(numRe)) {
    let n = Number(m[1].replace(/,/g, ""));
    if (m[2]) n += Number(`0.${m[2]}`);
    const unit = (m[3] ?? "").toLowerCase();
    if (unit === "m" || unit === "million") n *= 1_000_000;
    else if (unit === "k" || unit === "thousand") n *= 1_000;
    if (!Number.isFinite(n) || n <= 0) continue;

    for (const bound of bounds) {
      if (Math.abs(n - bound) / bound <= 0.1) {
        issues.push({
          field: "budget",
          claim: m[0].trim(),
          expected: "no specific budget figures in the message",
        });
        break;
      }
    }
  }
  return issues;
}

export function describeIssues(issues: FactCheckIssue[]): string {
  return issues
    .map((i) => `${i.field}: claimed "${i.claim}", expected ${i.expected}`)
    .join("; ");
}
