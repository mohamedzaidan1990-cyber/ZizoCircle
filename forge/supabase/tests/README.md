# Forge SQL tests

Each migration `NNNN_xxx.sql` has a sibling `NNNN_xxx.test.sql` here.
Tests wrap assertions in `BEGIN; ... ROLLBACK;` so they leave no data
behind. Assertions use `DO $$ ... RAISE EXCEPTION ... $$`.

Run one test (manual / psql):

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f forge/supabase/tests/0005_gold_inventory.test.sql
```

Run via Supabase MCP (from Claude Code):

```
mcp__claude_ai_Supabase__execute_sql(
  project_id='qbmxwaxezifsnysxyyez',
  query='<contents of the .test.sql file>',
)
```

Tests assume the live ForgeJewelery schema is in place.
