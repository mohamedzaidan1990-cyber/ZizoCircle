export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => rowToCamel<T>(r));
}

/**
 * Build the column list and parameterized VALUES clause for an INSERT.
 * Skips undefined values; null is preserved. Keys must appear in
 * `allowedColumns` (camelCase) — any other key throws, so callers can't
 * accidentally bind user input directly into column names.
 */
export function buildInsert(
  data: Record<string, unknown>,
  allowedColumns: ReadonlySet<string>,
): { columns: string; placeholders: string; values: unknown[] } {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (!allowedColumns.has(k)) {
      throw new Error(`buildInsert: column "${k}" is not in the allow-list`);
    }
    cols.push(`"${camelToSnake(k)}"`);
    placeholders.push(`$${i++}`);
    values.push(v);
  }
  return {
    columns: cols.join(", "),
    placeholders: placeholders.join(", "),
    values,
  };
}

/**
 * Build the SET clause for an UPDATE. Returns the clause and bound values
 * starting at parameter index `startIndex`. Same allow-list contract as
 * `buildInsert`.
 */
export function buildUpdate(
  data: Record<string, unknown>,
  allowedColumns: ReadonlySet<string>,
  startIndex = 1,
): { clause: string; values: unknown[] } {
  const parts: string[] = [];
  const values: unknown[] = [];
  let i = startIndex;
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (!allowedColumns.has(k)) {
      throw new Error(`buildUpdate: column "${k}" is not in the allow-list`);
    }
    parts.push(`"${camelToSnake(k)}" = $${i++}`);
    values.push(v);
  }
  return { clause: parts.join(", "), values };
}
