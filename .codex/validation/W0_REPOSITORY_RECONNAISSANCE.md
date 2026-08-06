# Validation Record: W0_REPOSITORY_RECONNAISSANCE

**Date:** 2026-08-01
**Mode:** read-only reconnaissance
**Product files changed:** none

## Commands Executed

| Command | Result |
| --- | --- |
| `npm ci` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 63 files / 322 tests |
| `npm run build` | PASS WITH WARNING — bundle exceeds Vite 500 kB warning threshold |
| `npm run validate:phase2` | PASS — 37 tables / 66 policies |
| `npm run validate:domain-schema` | FAIL — Opportunity stage domain/schema mismatch |
| `npm run validate:phase18b` | FAIL — stops at domain-schema after passing secret hygiene, test, lint and build |
| `npm run validate:china-media:seed` | BLOCKED — 3 precheck tests pass; package input missing |

## Environment Checks

- Root `AGENTS.md` was the only applicable instruction file discovered outside dependencies.
- `supabase` CLI was not available from the shell.
- No Playwright/Cypress configuration or command was discovered.
- No code-generation command was executed because the known generator writes a tracked seed SQL file.

## Evidence Artifacts

- `.codex/repo-map.md`
- `.codex/baseline-report.md`
- `.codex/command-map.yaml`
- `.codex/repository-overlay.md`
- `.codex/spec-gap-matrix.yaml`
- `.codex/implementation-plan.md`

## Result

`BASELINE_CAPTURED_WITH_OPEN_FAILURES`

The W0 reconnaissance deliverables are complete. Implementation must first correct the existing domain/schema alignment failure in a focused, reviewable change before beginning the versioned workflow-machine foundation.
