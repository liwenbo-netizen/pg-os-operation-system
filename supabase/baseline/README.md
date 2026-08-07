# Canonical Baseline

This directory records the canonical schema baseline adopted by CX-0194 Gate A.

- The baseline was proven reconstructable by CX-0193 (two independent sandbox rebuilds,
  two normalized schema diffs with zero unexplained differences, repeatability PASS,
  failure recovery VERIFIED).
- The canonical migration file is
  `supabase/migrations/20260807120000_pg_os_canonical_baseline.sql`.
- The 24 pre-baseline local migrations are preserved only as historical reference in
  `supabase/migrations-legacy/pre-canonical-baseline/` and must NOT be used for new
  database rebuilds.
- Remote legacy migration history (66 sequential versions) is historical reference only;
  adoption into the active history is analyzed in ADR-002 and executed only in Gate B.

Manifest: `manifest.yaml` (canonical version, hashes, schema counts, authority).
