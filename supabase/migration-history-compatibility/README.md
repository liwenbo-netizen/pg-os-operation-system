# Migration History Compatibility

The remote PG OS migration ledger preserves versions `000` through `065`, whose original SQL is no
longer available. The repository's executable migration chain remains canonical-only, beginning with
`20260807120000_pg_os_canonical_baseline.sql`.

CX-0195 uses a runtime-only adapter for Supabase CLI planning:

1. Create a temporary Supabase work directory.
2. Materialize `000` through `065` as no-op ledger markers (`select 1;`).
3. Copy the frozen canonical migration after those markers.
4. Run `migration list` and `db push --dry-run` against the temporary work directory.
5. Delete the temporary directory.

The markers are never copied into `supabase/migrations/`. Raw `supabase db push` remains fail-closed;
future remote migration operations must use an approved compatibility wrapper and a separate task card.

This directory authorizes no remote write. Gate B remains a separate approval boundary.
