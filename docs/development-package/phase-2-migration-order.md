# Phase 2 Migration Order

Phase 2 imports the locked database files from `PGOS_AI_DEVELOPMENT_PACKAGE_V2.11_ZERO_BUILD_CLEANED/02_DATABASE_LOCKED`.

## Files

1. `supabase/migrations/202606290001_base_schema.sql`
   - Source: `06_DATABASE_BASE_SCHEMA_LOCKED.sql`
   - Creates locked enums, base tables, indexes, and update triggers.

2. `supabase/migrations/202606290002_rls_policies.sql`
   - Source: `07_DATABASE_RLS_POLICY_LOCKED.sql`
   - Enables RLS and creates helper functions and policies.
   - Compatibility normalization: `create policy if not exists` was converted to `drop policy if exists` followed by `create policy`.

3. `supabase/seed/202606290003_uat_seed.sql`
   - Source: `08_DATABASE_SEED_UAT_DATA_LOCKED.sql`
   - Seeds 15 roles, capability tags, sample publishers, advertisers, diagnostic cases, and SOP cards.

4. `supabase/policies/rls_policies.sql`
   - Mirror copy of the active RLS migration for policy review.

## Execution

For a linked Supabase project or local Supabase database:

```bash
supabase migration up
psql "$DATABASE_URL" -f supabase/seed/202606290003_uat_seed.sql
```

If using SQL editor manually, execute the files in the exact order above.

## Local Static Validation

```bash
npm run validate:phase2
```

This check verifies:

- no legacy API response shape;
- no legacy status typo such as `technical_technical_live_passed`;
- no unsupported `create policy if not exists`;
- policy drop/create counts match;
- `system_admin` and `audit_viewer` remain excluded from business approval writes.

