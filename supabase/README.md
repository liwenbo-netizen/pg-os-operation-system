# Supabase

This folder contains PG OS database artifacts.

## Canonical Migration Chain (CX-0194 Gate A)

The active migration chain starts at the canonical baseline:

1. `migrations/20260807120000_pg_os_canonical_baseline.sql`
   - Adopted from the CX-0193 PROVEN candidate baseline (hash
     `deb164e1caa925d3f3f75a2a66906b851f0b77ca0d752ba5759a0ca806eee435`, using repository-canonical LF line endings).
   - Manifest: `baseline/manifest.yaml`; provenance: `baseline/README.md`.
2. Future migrations must use versions strictly newer than `20260807120000`
   and must never reintroduce legacy pre-baseline versions.

## Seeds

- `seed/202606290003_uat_seed.sql`
- `seed/202607100002_china_media_ecosystem_seed.sql`

## Legacy Historical Reference

The 24 pre-baseline migrations are archived verbatim in
`migrations-legacy/pre-canonical-baseline/` and must NOT be used for new database
rebuilds. See `migrations-legacy/README.md` and `ARCHIVE.md`.

The RLS policy file is mirrored in `policies/rls_policies.sql` for review.
