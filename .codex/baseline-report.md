# W0 Baseline Report

**Task:** `W0_REPOSITORY_RECONNAISSANCE`
**Captured:** 2026-08-01 (Asia/Shanghai)
**Outcome:** `BASELINE_GREEN_AFTER_CX-0004`

## Applicable Instructions

- Read and applied: `AGENTS.md` at repository root.
- Repository scan found no deeper applicable `AGENTS.md` outside `node_modules`.
- Required specifications read:
  - `docs/PG_OS_AI_Native_Specification_V1.8.0_Codex_Implementation_Ready_Final_20260731.md`
  - `docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml`
  - `docs/PG_OS_Codex_Implementation_Backlog_V1.0_20260731.md`
  - `docs/PG_OS_Repository_Overlay_Template_V1.0_20260731.md`

## Git Baseline

| Field | Value |
| --- | --- |
| Branch | `master` |
| HEAD | `af90a5c` — `Guide technical solution setup workflow` |
| HEAD date | `2026-07-30T16:00:18+08:00` |
| Remote reference | `origin/master` points at the same commit in the observed log |
| Existing worktree state | Dirty before W0 documentation: modified `src/pages/media/TechnicalIntegrationWorkspace.tsx`; untracked `AGENTS.md` and supplied V1.8 specification documents |

The modified integration workspace and untracked specifications pre-date W0. They were inspected only and not reverted, staged, or changed by this task.

## Executed Command Evidence

| Command | Result | Evidence / Notes |
| --- | --- | --- |
| `npm ci` | PASS | Completed in 33.9s; added 145 packages. This is the same install command used by CI and Vercel. |
| `npm run lint` | PASS | `tsc --noEmit` completed successfully. |
| `npm test` | PASS | CX-0004 final revalidation: 63 test files passed; 329 tests passed. |
| `npm run build` | PASS WITH WARNING | TypeScript check and Vite build passed. The JS bundle is 1,294.31 kB (325.34 kB gzip), above Vite's 500 kB warning threshold. |
| `npm run validate:phase2` | PASS | Static SQL validation reported 37 tables and 66 policies. |
| `npm run validate:domain-schema` | PASS | CX-0004 now uses AST-scoped extraction and confirmed `discovery, need_confirmed, proposal_drafting, proposal_review, won, lost` against both SQL constraints. |
| `npm run validate:phase18b` | PASS | CI-equivalent local UAT gate passed all local validation steps after CX-0004. It reported pending Git paths only, not a quality failure. |
| `npm run validate:china-media:seed` | PARTIAL / BLOCKED | Its Vitest precheck passed 3 tests. The runtime validator stopped because neither `--package <zip-path>` nor `PGOS_CHINA_MEDIA_SEED_PACKAGE` was supplied. |
| Supabase CLI migration check | PARTIAL / BLOCKED | CX-0190 pins `supabase@2.110.0`, adds `supabase/config.toml`, and passes CLI authentication plus a read-only remote Migration History query. Protected Staging values are Git-ignored and write-disabled; the production denylist is unresolved and no SQL was applied. |

## Architecture Findings

| Area | Baseline Finding | Evidence |
| --- | --- | --- |
| Client/runtime | React 18 + TypeScript + Vite single-page application | `package.json`, `vercel.json` |
| Data access | Browser chooses `SupabaseWorkflowRepository` when environment values exist, otherwise an in-memory local repository | `src/lib/supabase.ts:31-37`, `src/repositories/workflowRepositoryFactory.ts:6-13` |
| Workflow write shape | Supabase adapter snapshots table rows through `upsert(..., { onConflict: "id" })`; no transaction boundary or version predicate is visible at that write point | `src/repositories/supabaseWorkflowRepository.ts:1818-1838` |
| Domain guards | Client domain guard services cover routes, records, publisher readiness, proposal/campaign/settlement actions | `src/services/guardService.ts:49-382` |
| Authorization | Supabase Auth maps profiles and `user_roles`; RLS DDL/policies exist | `src/repositories/authSessionRepository.ts:286-324`, `supabase/migrations/202606290002_rls_policies.sql` |
| Technical integration | Scoped playbooks/checklists and handover data are implemented as service/UI constructs | `src/services/sdkIntegrationService.ts:1164-2942`, `src/pages/media/TechnicalIntegrationWorkspace.tsx` |
| Workflow-machine spec | Supplied V2.5 YAML defines transitions with required transactions, idempotency, optimistic locks, after-commit events and zero-side-effect failures | `docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml:590-720` |
| Feature flags/outbox/jobs | No source implementation was found in `src`, `scripts`, or `supabase`; only specification references matched | reconnaissance search recorded in `command-map.yaml` |
| Migration documentation | CX-0190 reconciled `supabase/README.md` with all 24 migration SQL files through `202607300001` | `supabase/README.md`, `supabase/migrations/` |

## Baseline Risks and Required Follow-Up

1. **CX-0004 completed:** the earlier CI failure was a broad-regex parser defect. `Opportunity.stage` and both SQL constraints already used the same six values; no domain/schema/data change was needed.
2. **Workflow contract gap:** the V2.5 machine is currently a supplied specification rather than a proven runtime source of truth. This is the first ready backlog slice, `CX-0101`.
3. **Atomicity gap:** client-side per-table snapshot upserts do not evidence the spec's server-side transactional executor, idempotency storage, or optimistic version enforcement.
4. **Migration environment remains blocked:** the protected Staging target and read-only credentials are configured and verified, but the account exposes only one owner-attested non-production Project. The mandatory production Project Ref/Host denylist, remote Schema baseline review, Dry Run, Schema Diff, idempotency and cleanup evidence remain unresolved.
5. **Build budget warning:** defer code-splitting decisions to a scoped performance batch after the CI baseline is repaired.

## W0 Exit Decision

Repository discovery is complete and CX-0004 restored the local CI baseline to green. The next planned card is CX-0101, but it has not been implemented in this batch.

## Current Baseline Addendum — CX-0194 Gate B Preflight (2026-08-08)

- CX-0101 and CX-0102 are complete; Workflow V2.5 remains default-off and Legacy remains active.
- CX-0193 is complete with reconstructability PROVEN.
- CX-0194 Gate A adopted Canonical migration `20260807120000`; its repository-canonical LF SHA-256 is
  `0f78eb8a4da3304c0a9f4b749e16663bd3f895ad01adc5242bf009d64d0d65e0`.
- Local Preflight gates pass: 74 test files / 437 tests, Typecheck, Build, phase18b, migration-chain,
  Workflow Machine, compatibility, and reconstructability.
- Current read-only Schema Diff passes with 178 matched tables and zero unexplained differences.
- Gate B Preflight is BLOCKED because Supabase CLI 2.110.0 rejects remote-only history versions
  `000`-`065` in both normal and `--include-all` dry-run modes. Its suggestion to mark all 66 versions
  reverted conflicts with ADR-002 history preservation and was not executed.
- Remote Schema, data, and Migration History writes performed by this Preflight: zero.

## Current Baseline Addendum — CX-0195 Migration History Compatibility (2026-08-08)

- ADR-003 accepts a runtime-only ledger adapter for preserved remote history `000`-`065`; no marker files
  enter `supabase/migrations/`, whose active chain remains canonical-only.
- Read-only Staging `migration list` aligns all 66 legacy versions. Both default and `--include-all`
  `db push --dry-run` plan only the frozen Canonical Baseline.
- Disposable Sandbox rehearsal succeeded with 301 compatibility batches and exact 67-version history;
  Schema Diff matched 178 tables with zero unexplained differences.
- Sandbox was restored using 235 canonical batches. Exact cleanup removed only `000`-`065`, left
  `[20260807120000]`, and the final Schema Diff remained zero.
- Staging Schema, data, and Migration History writes in CX-0195: zero.
- CX-0195 is complete. CX-0194 Gate B remains unauthorized; the next permitted action is a repeated
  Preflight through the approved adapter.

## Current Baseline Addendum — CX-0194 Gate B Preflight Repeat (2026-08-09)

- The repeated Preflight passed migration safety, canonical chain, reconstructability and Workflow Machine
  checks through the approved CX-0195 adapter.
- Remote Legacy versions `000`-`065` aligned; both dry-run modes planned only the Canonical Baseline.
- Current normalized Schema Diff matched 178 tables with zero missing, extra or unexplained differences.
- Full local validation passed after the cross-platform repairs: 76 test files / 449 tests, Typecheck, Build and Phase18B.
- Staging Schema, data and Migration History writes: zero.
- GitHub run `31266562871` exposed mixed Windows/LF frozen-hash drift. SQL is now forced to LF, manifests
  freeze Git-canonical hashes, and SQL semantics remain unchanged.
- GitHub run `31267260465` then exposed a Windows-only temporary cleanup path check. The guard now uses
  platform-native resolved parent/name checks and still fails closed for unsafe targets.
- Current status: `REMEDIATED_PENDING_GITHUB_CI`; Gate B remains not started and unauthorized.
