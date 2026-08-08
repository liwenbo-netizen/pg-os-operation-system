# CX-0194 Gate B Validation

**Result:** COMPLETED  
**Date:** 2026-08-09  
**Target:** repository-owner-attested `NO_PRODUCTION_PROJECT`

## Scope

Adopt canonical migration version `20260807120000` into remote Migration History only. Preserve legacy
versions `000`-`065`. Do not execute canonical SQL or write application Schema/business data.

## Evidence

- Before write: 66 legacy versions aligned; canonical was local-only; both plans contained only canonical.
- Write: one `migration repair --status applied 20260807120000` through the exact task-scoped runner.
- After write: 67 versions aligned; canonical present remotely; default and include-all plans empty.
- Remote Schema writes: 0. Remote business-data writes: 0. Migration History rows added: 1.
- Machine-readable evidence: `.codex/schema-baseline/cx0194-gate-b-adoption.json`.

## Validation

| Command | Result |
| --- | --- |
| `npm run validate:migration-safety` | PASS; writes disabled by default |
| `npm run validate:cx0194:gate-b` | PASS; 3 files / 26 tests |
| `npm run validate:cx0194:gate-b:remote` | PASS; 67 aligned / 0 planned |
| `npm test` | PASS; 77 files / 453 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS; existing bundle-size warning only |
| `npm run validate:phase18b` | PASS; 59.7s |

## Safety And Rollback

The generic no-production mode still rejects writes. Gate B requires `--apply`, the exact task approval
token, `PG_OS_ENABLE_MIGRATION_WRITE=true`, and the exact scope `CX-0194_GATE_B_HISTORY_ONLY`.

Rollback is to use the same target-identity and task-scope gates to mark only `20260807120000` reverted,
then verify the pre-adoption state. Never modify legacy versions `000`-`065`.

## Next State

```yaml
CX-0194: COMPLETED
CX-0201: READY
```
