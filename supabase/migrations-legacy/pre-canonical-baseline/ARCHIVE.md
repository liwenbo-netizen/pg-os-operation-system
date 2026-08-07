# Pre-Canonical Legacy Migration Archive

These 24 migrations are **historical reference only** after CX-0194 Gate A adopted the canonical
baseline (`supabase/migrations/20260807120000_pg_os_canonical_baseline.sql`).

- Content and file names are preserved exactly.
- They must NOT be used for new database rebuilds.
- The canonical migration chain starts at version `20260807120000`.

| Original path | Archived path | SHA-256 |
| --- | --- | --- |
| supabase/migrations/202606290001_base_schema.sql | supabase/migrations-legacy/pre-canonical-baseline/202606290001_base_schema.sql | 1fccda239e99cc99a050bfa61ddd96cd05125ee6fb00d68889e6ba96053d8b6b |
| supabase/migrations/202606290002_rls_policies.sql | supabase/migrations-legacy/pre-canonical-baseline/202606290002_rls_policies.sql | ac294d929809c9b7d11814a098143aa6f6828045bc263dca97bf769d60ae16b0 |
| supabase/migrations/202606290004_user_roles_self_read_policy.sql | supabase/migrations-legacy/pre-canonical-baseline/202606290004_user_roles_self_read_policy.sql | 9f7d78a51676b0dacdc78f8fdff2ef7b5d1ae358582b287780854158ad1181cd |
| supabase/migrations/202606290005_contracts_write_policy.sql | supabase/migrations-legacy/pre-canonical-baseline/202606290005_contracts_write_policy.sql | 36c9737e3f2ba57ab03b129f10505f5f74333256ca5598f5603e4c5fe8d9d83a |
| supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql | supabase/migrations-legacy/pre-canonical-baseline/202606290006_opportunity_stage_domain_alignment.sql | 8c94b718becfd80d1aefcb259cdd08a1a46e92592b9aacf59d597edb775990a8 |
| supabase/migrations/202607020001_audit_logs_business_write_policy.sql | supabase/migrations-legacy/pre-canonical-baseline/202607020001_audit_logs_business_write_policy.sql | b4304ab505518329dad08e525fcdeca4a946b420413be294c9f9c7d966b35b4e |
| supabase/migrations/202607020002_media_manager_integration_project_policy.sql | supabase/migrations-legacy/pre-canonical-baseline/202607020002_media_manager_integration_project_policy.sql | 5d8b25cb489a67c7056046a2d11a75c09b32a2b7949631bacf624ddc33a49726 |
| supabase/migrations/202607020003_uat_script_results.sql | supabase/migrations-legacy/pre-canonical-baseline/202607020003_uat_script_results.sql | 0826bf284f14d99486206801ca3a500971e5a8fc66ebcc8e1e4d896e5284a971 |
| supabase/migrations/202607040001_contract_uat_seed.sql | supabase/migrations-legacy/pre-canonical-baseline/202607040001_contract_uat_seed.sql | 351662ad7d3cbd25193caea13cff52c256e911b9fdc861f772236b2c95e307c0 |
| supabase/migrations/202607100001_china_media_ecosystem_schema.sql | supabase/migrations-legacy/pre-canonical-baseline/202607100001_china_media_ecosystem_schema.sql | c74ef27420c862c007b45b8c2747b43e1f5982018b67b386eed45a0695f4dd5c |
| supabase/migrations/202607120001_trusted_supply_candidate_readiness.sql | supabase/migrations-legacy/pre-canonical-baseline/202607120001_trusted_supply_candidate_readiness.sql | c2ecd8980873498674f5af14f42cfa88366db4115a5d99aadba4f07dd6f0a93b |
| supabase/migrations/202607160001_integration_execution_readiness.sql | supabase/migrations-legacy/pre-canonical-baseline/202607160001_integration_execution_readiness.sql | a4a4f77c95f6be4b3cc8ea3ed14555f4254abab05901124aa9d7fda42050085b |
| supabase/migrations/202607170001_commercial_validation_handoff.sql | supabase/migrations-legacy/pre-canonical-baseline/202607170001_commercial_validation_handoff.sql | 0850b2239996d9db9b067e35349fbfe1c7d0b58b2fc55247452ca4d2e2b77fcc |
| supabase/migrations/202607170002_trusted_supply_qualification.sql | supabase/migrations-legacy/pre-canonical-baseline/202607170002_trusted_supply_qualification.sql | 2f679f3af5261384f50eaea23deaff272befed321f34d62b9db8fe4dff9c1482 |
| supabase/migrations/202607170003_trusted_supply_packages.sql | supabase/migrations-legacy/pre-canonical-baseline/202607170003_trusted_supply_packages.sql | 2ed2c900c16aa107e1100ed494e5d92f320605954771b88cbc212b764abf10ad |
| supabase/migrations/202607170004_commercial_test_publisher_status_sync.sql | supabase/migrations-legacy/pre-canonical-baseline/202607170004_commercial_test_publisher_status_sync.sql | 8117f6410ed5890047404ec82a2bfc53f38ba2136fa2745449bc8681baa979be |
| supabase/migrations/202607220001_publisher_traffic_evidence_history.sql | supabase/migrations-legacy/pre-canonical-baseline/202607220001_publisher_traffic_evidence_history.sql | 6dd5072615355ed195e66c64a147bb9593f07d30487aeb90f085b0ce128224a4 |
| supabase/migrations/202607260001_media_onboarding_stage_gates.sql | supabase/migrations-legacy/pre-canonical-baseline/202607260001_media_onboarding_stage_gates.sql | 8dfb68c0c37b79dd8a32d1a7eaf7612e2a8a0d3cc1371ad47bdc3559140b3db4 |
| supabase/migrations/202607270001_sdk_integration_playbook_foundation.sql | supabase/migrations-legacy/pre-canonical-baseline/202607270001_sdk_integration_playbook_foundation.sql | 3eb0aaa8ae09aa92cab360b47099d3ec1ac33f90dae53f3ce17baf4a483dfe09 |
| supabase/migrations/202607280001_sdk_cross_role_check_ownership.sql | supabase/migrations-legacy/pre-canonical-baseline/202607280001_sdk_cross_role_check_ownership.sql | 08ee16eab0e2e0397d8ab96ccad75c11d67043326c64b8d07e84e7237b63cbe9 |
| supabase/migrations/202607280002_multichannel_integration_assessment.sql | supabase/migrations-legacy/pre-canonical-baseline/202607280002_multichannel_integration_assessment.sql | 33dd280579c8536584720fb769de62fd11893c2d49490ce14e1a879a082288ba |
| supabase/migrations/202607280003_integration_pilot_scale_owner_policy.sql | supabase/migrations-legacy/pre-canonical-baseline/202607280003_integration_pilot_scale_owner_policy.sql | 069b3ebe3ddaa80b7bb72124ce68ab35c4f35a379089b1e815f21e026da48b14 |
| supabase/migrations/202607290001_integration_commercial_gate_owners.sql | supabase/migrations-legacy/pre-canonical-baseline/202607290001_integration_commercial_gate_owners.sql | 10f74c29b23bfa2de7a486983f176b5e32af6cf3506eb5d9c4502ca61f821d39 |
| supabase/migrations/202607300001_publisher_technical_handoff.sql | supabase/migrations-legacy/pre-canonical-baseline/202607300001_publisher_technical_handoff.sql | 9b1ad167ee1d0b4a736a0fd6282f1ebb87551ef8f438379477f209af0810d205 |
