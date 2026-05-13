export function formatQAR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatGrams(grams: number | null | undefined, digits = 3): string {
  if (grams == null) return "—";
  return `${grams.toFixed(digits)} g`;
}

export function formatCarats(ct: number | null | undefined): string {
  if (ct == null) return "—";
  return `${ct.toFixed(3)} ct`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
