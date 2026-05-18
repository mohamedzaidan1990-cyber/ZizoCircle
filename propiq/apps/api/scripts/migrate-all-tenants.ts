/**
 * Fan out every additive migration across every existing tenant.
 * Idempotent — safe to re-run. Same code path the api uses on boot.
 *
 * Usage:
 *   pnpm --filter @propiq/api exec tsx scripts/migrate-all-tenants.ts
 */
import "dotenv/config";
import { closePool, migrateAllTenants } from "../src/db/tenant";

async function main() {
  // eslint-disable-next-line no-console
  console.log("[migrate-all] starting…");
  const { slugs, errors } = await migrateAllTenants();
  // eslint-disable-next-line no-console
  console.log(
    `[migrate-all] migrated ${slugs.length - errors.length}/${slugs.length} tenants`,
  );
  for (const e of errors) {
    // eslint-disable-next-line no-console
    console.error(`[migrate-all] FAILED ${e.slug}: ${e.error}`);
  }
  await closePool();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[migrate-all] threw:", err);
  process.exit(1);
});
