# CX-0194 Gate B Preflight Repeat

- Captured: 2026-08-09 00:11 UTC+8
- Result: `REMEDIATED_PENDING_GITHUB_CI`
- Task type: preflight safety gate
- Gate A: completed
- Gate B: not started and not authorized
- Product/runtime behavior changed: no
- Staging writes: 0

## Scope

This repeat Preflight revalidates the Canonical migration chain after CX-0195 introduced the approved
runtime ledger compatibility adapter. It does not execute `migration repair`, a real `db push`, Schema SQL,
data changes, or Migration History writes.

## Preflight Evidence

- Migration safety aggregate: PASS in `NO_PRODUCTION_PROJECT` mode; source writes are disabled.
- Supabase CLI: exact project dependency `2.110.0`.
- Canonical active chain: one file, version `20260807120000`; Legacy active chain is false.
- Baseline reconstructability: PROVEN.
- Remote Migration History: versions `000`-`065` aligned through the runtime adapter.
- Default and `--include-all` dry-runs: only
  `20260807120000_pg_os_canonical_baseline.sql` is planned.
- Read-only Schema Diff: 178 tables matched, 0 missing, 0 extra, 0 unexplained differences.
- Remote Schema writes: 0; data writes: 0; Migration History writes: 0.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run validate:baseline-environment` | PASS; Staging writes disabled, Sandbox writes enabled |
| `npm run validate:migration-safety` | PASS after loading optional protected local env |
| `npm run validate:cx0194:preflight` | PASS |
| `npm run validate:cx0195:remote-read-only` | PASS; 66 aligned; canonical-only plan; writes 0 |
| `npm run db:schema:diff -- --output=.codex/schema-baseline/cx0194-gate-b-preflight-repeat-diff.json` | PASS; 178 matched; zero difference |
| `npm test` | PASS; 76 files / 448 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS with existing 1,294.31 kB bundle warning |
| `npm run validate:secret-hygiene` | PASS; final scan 397 text files |
| `npm run validate:phase18b` | PASS; 67.7s |

## Minimal Validation Command Repair

`validate:migration-safety` initially failed because its two environment-sensitive child commands did not
load the already configured `.env.migration.local`. Direct execution with that protected environment passed.
`package.json` now uses `--env-file-if-exists=.env.migration.local` for those child commands, preserving CI
environment injection while making the discovered local aggregate command work. No safety rule was relaxed.

## GitHub CI Cross-Platform Remediation

GitHub Actions run `31266562871` failed before the UAT gate because the frozen Baseline hashes had been
captured from a Windows working tree containing 154 CRLF lines, while Git stores and Linux checks out the
same SQL as LF. The committed SQL content and Schema semantics were unchanged. The repository now enforces
LF for SQL through `.gitattributes`; the Baseline and compatibility manifests freeze the Git-canonical LF
hashes; and a regression test rejects carriage returns in the Canonical and candidate SQL. Local Preflight,
448 tests, Build, Phase18B, and the remote read-only canonical-only plan all pass after the repair.

## Remaining Gate

GitHub CI must pass for the remediation commit before CX-0194 may be marked
`READY_FOR_GATE_B_APPROVAL`. Even after CI passes, Gate B still requires a separate explicit approval before
any Staging Migration History write.

## Rollback

Revert the Preflight evidence/command-wiring commit. No database rollback is required because all Staging
operations were read-only.
