# PG OS Codex Implementation Backlog V1.0

> Main specification: `PG_OS_AI_Native_Specification_V1.8.0_Codex_Implementation_Ready_Final_20260731.md`  
> Machine definition: `PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml`

Codex completes W0 first, then executes only gaps proven by repository evidence.

# W0_REPOSITORY_RECONNAISSANCE

**Goal:** Understand and baseline the existing repository before product changes.

**Exit gate:** `REPOSITORY_DISCOVERED_AND_BASELINE_CAPTURED`

## [ ] CX-0001 — Map the repository

**Objective:** Create a concrete map from the PG OS specification to the existing project.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** None

**Specification:** 0, 8, 15, 19

**Inspect first:**
- AGENTS.md
- manifests
- source directories
- database
- tests
- CI

**Allowed scope:**
- .codex documentation only

**Do not include:**
- product code edits
- dependency upgrades
- formatting changes

**Required outputs:**
- .codex/repo-map.md
- .codex/repository-overlay.md

**Acceptance evidence:**
- module map complete
- unknowns listed
- generated directories identified

**Rollback:** Delete discovery artifacts only.

## [ ] CX-0002 — Capture the repository baseline

**Objective:** Discover and run the repository's real validation commands before code changes.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0001

**Specification:** 17, 18, 19

**Inspect first:**
- package scripts
- Makefile
- CI
- test configuration
- migration head

**Allowed scope:**
- .codex documentation only

**Do not include:**
- fixing unrelated failures
- inventing replacement commands

**Required outputs:**
- .codex/baseline-report.md
- .codex/command-map.yaml

**Acceptance evidence:**
- commands recorded
- results recorded
- pre-existing failures separated

**Rollback:** Delete baseline artifacts only.

## [ ] CX-0003 — Build the specification gap matrix

**Objective:** Classify each major capability as present, partial, missing or conflicting.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0001, CX-0002

**Specification:** 1-22, workflow machine

**Inspect first:**
- models
- services
- routes
- UI
- tests

**Allowed scope:**
- .codex documentation only

**Do not include:**
- assuming a gap without repository search
- marking complete without evidence

**Required outputs:**
- .codex/spec-gap-matrix.yaml
- .codex/implementation-plan.md

**Acceptance evidence:**
- each gap cites evidence
- tasks marked skip, ready or blocked

**Rollback:** Delete planning artifacts only.

# W1_FOUNDATION_AND_COMPATIBILITY

**Goal:** Add specification loading, adapters and flags without changing default behavior.

**Exit gate:** `FOUNDATION_SEAMS_VALIDATED`

## [ ] CX-0101 — Add versioned machine loading

**Objective:** Load and validate the Workflow Machine using the existing configuration architecture.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0003

**Specification:** 9-11, 15.9, 19

**Inspect first:**
- configuration
- dependency injection
- existing registries

**Allowed scope:**
- minimal loader
- validation
- tests

**Do not include:**
- duplicate hard-coded registry
- runtime eval
- framework rewrite

**Required outputs:**
- machine loader
- reference validation
- failure behavior

**Acceptance evidence:**
- valid machine loads
- invalid references fail fast
- default behavior unchanged

**Rollback:** Disable the loader and use the existing path.

## [ ] CX-0102 — Establish adapters and feature flags

**Objective:** Create reversible seams for workflow and user-experience changes.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0101

**Specification:** 15, 20

**Inspect first:**
- feature flags
- service interfaces
- routing seams

**Allowed scope:**
- adapters
- flags
- tests

**Do not include:**
- default-on rollout
- permanent flags
- duplicated business logic

**Required outputs:**
- flag definitions
- adapter interfaces
- rollback path

**Acceptance evidence:**
- legacy path remains available
- flags have owner and removal date

**Rollback:** Turn flags off and use compatibility adapters.

# W2_WORKFLOW_KERNEL

**Goal:** Align state persistence, transition execution, gates, audit, outbox and timers.

**Exit gate:** `WORKFLOW_KERNEL_VALIDATED`

## [ ] CX-0201 — Align workflow persistence

**Objective:** Implement the five-dimensional state and execution history through expand/contract migration.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0102

**Specification:** 5, 6.6, 9, 15.2, 20

**Inspect first:**
- schema
- migrations
- legacy state fields
- data volume

**Allowed scope:**
- schema additions
- backfill
- compatibility repository
- tests

**Do not include:**
- destructive first migration
- manual production data edits
- direct state patch

**Required outputs:**
- migration
- idempotent backfill
- compatibility reads/writes

**Acceptance evidence:**
- stage-node invariant
- version lock
- history preserved

**Rollback:** Use compatibility reads and reverse only non-destructive additions.

## [ ] CX-0202 — Implement transition execution

**Objective:** Implement atomic, idempotent and optimistic-lock transition execution.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0201

**Specification:** 11, 12, 15.3-15.5, 16

**Inspect first:**
- commands/services
- transaction manager
- idempotency patterns

**Allowed scope:**
- evaluator
- executor
- application service
- tests

**Do not include:**
- direct state update
- last-write-wins
- events before commit

**Required outputs:**
- evaluate/execute
- idempotency record
- version conflict handling

**Acceptance evidence:**
- failure zero side effects
- duplicate key returns same result

**Rollback:** Disable the new executor and use the compatibility path.

## [ ] CX-0203 — Implement guards, checklists and target resolvers

**Objective:** Use deterministic registry-driven evaluation without arbitrary code execution.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0202

**Specification:** 10, 11, 15.6

**Inspect first:**
- validation framework
- domain fact sources

**Allowed scope:**
- safe evaluator
- evidence checks
- reference lint
- tests

**Do not include:**
- eval
- JavaScript expressions
- SQL fragments
- client-only validation

**Required outputs:**
- operator implementation
- checklist evaluator
- resolver whitelist

**Acceptance evidence:**
- all registered operators tested
- unknown codes rejected

**Rollback:** Disable new evaluators while retaining registry data.

## [ ] CX-0204 — Implement audit, outbox and timers

**Objective:** Guarantee durable audit, after-commit events and workflow timing.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0202

**Specification:** 6.23-6.26, 12, 15.7-15.8, 17

**Inspect first:**
- event bus
- jobs
- scheduler
- audit store

**Allowed scope:**
- audit
- outbox
- timer service
- tests

**Do not include:**
- external notification inside transaction
- non-idempotent consumers

**Required outputs:**
- audit record
- outbox publisher
- timer behavior

**Acceptance evidence:**
- event after commit
- retry idempotent
- backlog observable

**Rollback:** Stop new consumers while preserving audit and outbox data.

# W3_DOMAIN_AND_AUTHORIZATION

**Goal:** Implement missing readiness objects, roles, scopes and field ownership.

**Exit gate:** `DOMAIN_AND_AUTHORIZATION_VALIDATED`

## [ ] CX-0301 — Implement missing readiness and passport objects

**Objective:** Add only missing review, readiness and sellability domain capabilities.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0204

**Specification:** 6.35-6.53, 13, 14

**Inspect first:**
- opportunity models
- approval models
- document models

**Allowed scope:**
- missing models
- repositories
- services
- tests

**Do not include:**
- duplicate existing entities
- one mega-table
- mutable used passport version

**Required outputs:**
- review objects
- stale logic
- versioned passport

**Acceptance evidence:**
- expiry works
- used passport version remains immutable

**Rollback:** Disable object creation through flags and preserve data.

## [ ] CX-0302 — Implement roles, data scopes and field ownership

**Objective:** Enforce canonical roles, active-role switching, delegation and field editing rules.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0301

**Specification:** 13, 14.18, 16

**Inspect first:**
- authentication
- role tables
- tenant scope
- delegation

**Allowed scope:**
- server policies
- alias migration
- negative tests

**Do not include:**
- UI-only authorization
- ADMIN implicit approval
- new writes with deprecated aliases

**Required outputs:**
- authorization policies
- delegation audit
- field ownership enforcement

**Acceptance evidence:**
- allow and deny tests
- delegation records both users

**Rollback:** Run policies in audit-only mode through a flag.

# W4_API_AND_ORCHESTRATION

**Goal:** Expose workflow, role, readiness, guided and usability orchestration APIs.

**Exit gate:** `API_CONTRACTS_VALIDATED`

## [ ] CX-0401 — Implement workflow APIs

**Objective:** Expose state, available transitions, gate results, evaluate and execute through existing API conventions.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0203, CX-0302

**Specification:** 16.1-16.5

**Inspect first:**
- routing
- serialization
- error envelope
- auth middleware

**Allowed scope:**
- API contracts
- authorization
- tests

**Do not include:**
- generic workflow PATCH
- raw stack traces
- duplicate guard logic

**Required outputs:**
- endpoints
- contract tests
- stable error mapping

**Acceptance evidence:**
- server source of truth
- version conflict and remediation returned

**Rollback:** Disable routes or route to compatibility controllers.

## [ ] CX-0402 — Implement role, readiness and guided APIs

**Objective:** Expose workspaces, reviews, passports, task routing, drafts and quick actions.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0301, CX-0401, CX-0102

**Specification:** 16.6-16.9, 13, 14

**Inspect first:**
- REST or RPC conventions
- pagination
- forms and draft storage

**Allowed scope:**
- role/readiness/guided endpoints
- data scope
- tests

**Do not include:**
- privileged legal/financial leakage
- guided API writing state directly

**Required outputs:**
- role APIs
- guided APIs
- delta service
- quick actions

**Acceptance evidence:**
- submit re-evaluates transition
- expired passport excluded
- normal users do not select flows

**Rollback:** Turn endpoints and routing off by feature flag.

# W5_ROLE_WORKSPACES_AND_GUIDED_UX

**Goal:** Implement reusable UI foundations and role flows incrementally.

**Exit gate:** `ROLE_UX_VALIDATED`

## [ ] CX-0501 — Implement the workspace and reusable guided UI foundation

**Objective:** Build the role-adaptive shell and reusable guided components using the existing design system.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0402

**Specification:** 13, 14, 6.46-6.53

**Inspect first:**
- app shell
- design system
- forms
- drawers
- steppers
- responsive patterns

**Allowed scope:**
- workspace shell
- reusable components
- draft integration
- accessibility

**Do not include:**
- parallel design system
- one-off component per flow
- hard-coded role data

**Required outputs:**
- Focus/Work/Analyze
- guided components
- role navigation

**Acceptance evidence:**
- complexity budget
- keyboard and 1280px
- unauthorized navigation hidden

**Rollback:** Feature flag the new shell and return to the legacy home.

## [ ] CX-0502 — Implement role flows incrementally

**Objective:** Deliver one or two highest-value role flows per batch through configuration.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0501

**Specification:** 13, 14, 18.7-18.9

**Inspect first:**
- highest-frequency tasks
- legacy pages to adapt

**Allowed scope:**
- one or two flows
- tests
- telemetry

**Do not include:**
- all roles in one batch
- manual flow picker
- duplicated gate logic

**Required outputs:**
- configured flow
- role tests
- screenshots or interaction evidence

**Acceptance evidence:**
- next best action routes correctly
- plain language shown

**Rollback:** Disable each role flow independently.

# W6_COMMERCIALIZATION_AND_RUNTIME

**Goal:** Implement composite readiness, sellability, gray/ramp and production safety.

**Exit gate:** `COMMERCIAL_AND_RUNTIME_VALIDATED`

## [ ] CX-0601 — Implement composite readiness and sellability

**Objective:** Enforce six readiness dimensions and publish versioned sellability passports.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0301, CX-0402, CX-0502

**Specification:** 6.37-6.45, 11 TR-023/TR-025, 13, 14

**Inspect first:**
- existing approvals
- commercial-ready behavior
- sales search

**Allowed scope:**
- parallel reviews
- composite calculation
- passport
- matching constraints

**Do not include:**
- auto-approval
- override of legal/financial blocks
- sales outside passport scope

**Required outputs:**
- readiness room
- stale rules
- passport versioning
- tests

**Acceptance evidence:**
- all six current approvals
- expired passport excluded

**Rollback:** Flag enforcement and new sales behavior off while preserving records.

## [ ] CX-0602 — Implement gray, ramp and safety controls

**Objective:** Align G1-G5 operation, approved caps, Auto Pause, rollback and recovery.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0204, CX-0401

**Specification:** 6.11-6.25, 11 TR-020-033, 12, 17

**Inspect first:**
- runtime controls
- metrics
- incident and rollback path

**Allowed scope:**
- runtime services
- operational UI
- incident workflow
- tests

**Do not include:**
- mock-only safety
- budget above approved step
- promotion during pause

**Required outputs:**
- control path
- Auto Pause
- rollback evidence
- recovery whitelist

**Acceptance evidence:**
- stop-loss first
- real control path validated

**Rollback:** Use the kill switch to restore existing runtime controls.

# W7_MIGRATION_ROLLOUT_AND_HARDENING

**Goal:** Backfill safely, roll out by flag, run usability benchmarks and harden.

**Exit gate:** `PRODUCTION_READINESS_VALIDATED`

## [ ] CX-0701 — Backfill and verify historical data

**Objective:** Migrate legacy records safely without false readiness elevation.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0201, CX-0301, CX-0601

**Specification:** 20, 21

**Inspect first:**
- data volumes
- legacy states
- historical approvals

**Allowed scope:**
- dry run
- idempotent backfill
- verification
- manual review queue

**Do not include:**
- guessing ambiguous state
- mass update without dry run

**Required outputs:**
- dry-run report
- count checks
- manual exception list

**Acceptance evidence:**
- no false Commercial Ready or Scale Ready elevation

**Rollback:** Stop the backfill, use compatibility reads and restore logged previous values.

## [ ] CX-0702 — Roll out by role and complete final verification

**Objective:** Enable capabilities gradually, run repository and usability gates, and remove only proven temporary seams.

**Condition:** `ONLY_IF_GAP_PRESENT`

**Depends on:** CX-0502, CX-0601, CX-0602, CX-0701

**Specification:** 17, 18, 20, 21

**Inspect first:**
- feature flags
- pilot users
- telemetry
- CI
- temporary adapters

**Allowed scope:**
- rollout matrix
- dashboards
- runbook
- validated cleanup

**Do not include:**
- big-bang rollout
- flag without owner
- premature compatibility removal

**Required outputs:**
- pilot evidence
- .codex/final-completion-report.md
- .codex/latest-validation.yaml

**Acceptance evidence:**
- quality gates pass
- usability benchmarks recorded
- rollback drill passes

**Rollback:** Turn capability flags off and revert the cleanup batch.

