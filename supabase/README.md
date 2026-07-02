# Supabase

This folder contains PG OS Phase 2 database artifacts.

## Migration Order

1. `migrations/202606290001_base_schema.sql`
2. `migrations/202606290002_rls_policies.sql`
3. `migrations/202606290004_user_roles_self_read_policy.sql`
4. `migrations/202606290005_contracts_write_policy.sql`
5. `migrations/202606290006_opportunity_stage_domain_alignment.sql`
6. `migrations/202607020001_audit_logs_business_write_policy.sql`
7. `migrations/202607020002_media_manager_integration_project_policy.sql`
8. `seed/202606290003_uat_seed.sql`

The RLS policy file is mirrored in `policies/rls_policies.sql` for review.
