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
8. `migrations/202607020003_uat_script_results.sql`
9. `migrations/202607040001_contract_uat_seed.sql`
10. `migrations/202607100001_china_media_ecosystem_schema.sql`
11. `migrations/202607120001_trusted_supply_candidate_readiness.sql`
12. `migrations/202607160001_integration_execution_readiness.sql`
13. `migrations/202607170001_commercial_validation_handoff.sql`
14. `migrations/202607170002_trusted_supply_qualification.sql`
15. `migrations/202607170003_trusted_supply_packages.sql`
16. `migrations/202607170004_commercial_test_publisher_status_sync.sql`
17. `migrations/202607220001_publisher_traffic_evidence_history.sql`
18. `seed/202606290003_uat_seed.sql`
19. `seed/202607100002_china_media_ecosystem_seed.sql`

The RLS policy file is mirrored in `policies/rls_policies.sql` for review.
