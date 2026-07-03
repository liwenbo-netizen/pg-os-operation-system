# Phase 38 Report - User-Assisted Live-Write UAT / RLS & Audit Proof

Status: PASS for the Media Manager production live-write path and CEO audit proof. Sales Manager production live-write produced valid advertiser/proposal/audit proof and exposed one business-context defect in opportunity creation.

Recorded at: 2026-07-03 14:36:56 +08:00.

Production URL:

```text
https://pg-os-operation-system.vercel.app/
```

## Objective

Execute a controlled production UAT write path with a real Supabase session, then prove that:

- role-bound writes succeed without RLS warnings;
- repository status remains healthy;
- audit and business events are visible to CEO from live Supabase data;
- event timestamps display in UTC+8 for operator review.

## User-Assisted Boundary

The Supabase password was entered manually by the operator. Codex did not type or store the password.

The operator confirmed the following browser actions before Codex executed them:

- `New publisher`
- `Add slot`
- `Add terms`
- `New advertiser`
- `Create opportunity`
- `Create Proposal`
- `Validate media`

## Media Manager Live Write

Session:

```text
Account: media_manager@poly-gamma.com
Active role: Media Manager
Auth mode: Supabase auth
Initial repository state: Supabase synced
```

Executed actions:

| Action | Browser feedback | Result |
| --- | --- | --- |
| New publisher | `PUBLISHER_CREATED` | PASS |
| Add slot | `AD_SLOT_CREATED` | PASS |
| Add terms | `CONTRACT_TERM_CREATED` | PASS |

Observed production data:

```text
Publisher: Demo Audio Network
Publisher count after creation: 1
Supabase warning count: 0
Repository state after writes: Supabase synced
```

## CEO Audit Proof

Session:

```text
Account: ceo@poly-gamma.com
Active role: CEO
Audit route: /audit/events
Audit source: Supabase live
Loaded at: 2026-07-03 14:34:55 UTC+8
Supabase warning count: 0
```

Verified audit and business events:

| Event | Module | Object | Status | Created |
| --- | --- | --- | --- | --- |
| `publisher.create` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | allowed | 2026-07-03 14:17:20 UTC+8 |
| `publisher.created` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | business | 2026-07-03 14:17:20 UTC+8 |
| `publisher_ad_slot.create` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | allowed | 2026-07-03 14:23:26 UTC+8 |
| `publisher.ad_slot_created` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | business | 2026-07-03 14:23:26 UTC+8 |
| `publisher_contract_term.create` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | allowed | 2026-07-03 14:23:28 UTC+8 |
| `publisher.contract_term_created` | Media | publisher `7db013ce-9ea0-4621-81a9-2a16b47da7a7` | business | 2026-07-03 14:23:28 UTC+8 |

## Sales Manager Live Write

Recorded at: 2026-07-03 15:16:47 +08:00.

Session:

```text
Account: sales_manager@poly-gamma.com
Active role: Sales Manager
Auth mode: Supabase auth
Initial repository state: Supabase synced
```

Executed actions:

| Action | Browser feedback | Result |
| --- | --- | --- |
| New advertiser | `ADVERTISER_CREATED` | PASS |
| Create opportunity | `NOT_FOUND` / `Advertiser was not found.` | FAIL - business context binding |
| Create Proposal | `PROPOSAL_CREATED` | PASS |
| Validate media | `TECHNICAL_NOT_LIVE` / publisher guard blocked invalid media | PASS - guard behavior |

Observed production data:

```text
Advertisers after creation: 13
Opportunities after attempted creation: 1
Proposals after creation: 1
Repository state after writes: Supabase synced
Supabase warning count: 0
```

The Sales run did not produce an RLS failure. The failed `Create opportunity` step is a business workflow issue: the UI created or selected advertiser context was not available to the opportunity creation action, so the action returned `Advertiser was not found.`.

## CEO Sales Audit Proof

Session:

```text
Account: ceo@poly-gamma.com
Active role: CEO
Audit route: /audit/events
Audit source: Supabase live
Loaded at: 2026-07-03 15:16:08 UTC+8
Supabase warning count: 0
```

Verified Sales audit and business events:

| Event | Module | Object | Status | Created |
| --- | --- | --- | --- | --- |
| `advertiser.create` | Sales | advertiser `da16ce13-2853-4c03-a697-ce37ca572a7f` | allowed | 2026-07-03 15:03:22 UTC+8 |
| `advertiser.created` | Sales | advertiser `da16ce13-2853-4c03-a697-ce37ca572a7f` | business | 2026-07-03 15:03:22 UTC+8 |
| `proposal.create` | Sales | proposal `222a3d1e-e996-4331-b84b-a6f7d9dc79d2` | allowed | 2026-07-03 15:06:18 UTC+8 |
| `proposal.created` | Sales | proposal `222a3d1e-e996-4331-b84b-a6f7d9dc79d2` | business | 2026-07-03 15:06:18 UTC+8 |
| `proposal.publisher.select` | Media | proposal `222a3d1e-e996-4331-b84b-a6f7d9dc79d2` | blocked | 2026-07-03 15:09:21 UTC+8 |
| `proposal.publisher_guard_evaluated` | Media | proposal `222a3d1e-e996-4331-b84b-a6f7d9dc79d2` | business | 2026-07-03 15:09:21 UTC+8 |

No `opportunity.create` or `opportunity.created` event was found for this run, matching the UI-level `Advertiser was not found.` failure.

## RLS / Warning Result

No active Supabase repository warnings were observed after the Media or Sales write sequences.

Previously sensitive Media tables covered by this run:

- `publishers`
- `integration_projects`
- `ad_slots`
- `contract_terms`

Sales write/audit coverage touched:

- `advertisers`
- `proposals`
- proposal publisher guard evaluation
- `audit_logs`
- `module_business_events`

The CEO audit stream proved both audit-log style allowed events and business-event style domain events are readable from production for Media and Sales.

## Acceptance Criteria

- Real Supabase Media Manager session can create a publisher. PASS.
- Publisher creation no longer produces an `integration_projects` RLS warning. PASS.
- Media Manager can add an ad slot. PASS.
- Media Manager can add commercial terms. PASS.
- Repository status remains `Supabase synced` after writes. PASS.
- CEO can open `/audit/events` with `Supabase live` source. PASS.
- Media write events are visible in `/audit/events`. PASS.
- Real Supabase Sales Manager session can create an advertiser. PASS.
- Sales Manager advertiser creation writes audit/business events. PASS.
- Sales Manager opportunity creation reveals missing advertiser context binding. FAIL - recorded defect.
- Sales Manager can create a proposal from the existing opportunity path. PASS.
- Sales Manager media validation guard records blocked selection without RLS warning. PASS.
- Sales write and guard events are visible in `/audit/events`. PASS.
- Audit timestamps display as `UTC+8`. PASS.
- No password was typed or retained by Codex. PASS.

## Next Recommended Scope

Continue Phase 38 with the remaining live-write UAT roles and the Sales defect fix:

- Finance Manager: reconciliation, confirmation guard, invoice/payment progression.
- Legal Manager: finance review, legal approval, signing/archive guard.
- Sales Manager follow-up: fix the `Create opportunity` advertiser context binding and rerun that step.

After those role runs, record a consolidated production UAT result in `/uat/scripts` and review it through `/uat/history`.

## Sales Follow-Up Fix

Recorded at: 2026-07-03 15:26:47 +08:00.

The `Create opportunity` advertiser context binding defect was fixed in code:

- `src/pages/sales/SalesExperiencePage.tsx` no longer hardcodes `advertiser-daily-yoga`.
- `src/pages/sales/salesExperiencePageModel.ts` resolves the advertiser id from the current Sales state.
- Successful opportunity creation now selects the newly created opportunity so the next `Create Proposal` action stays on the same business chain.
- `npm run validate:phase5` now includes the page model regression test.

Local validation:

```text
npm run validate:phase5
npm run lint
npm run build
```

Result:

```text
PASS
```

Production follow-up required after deployment:

- Log in as `sales_manager@poly-gamma.com`.
- Execute `New advertiser`.
- Execute `Create opportunity`.
- Confirm `OPPORTUNITY_CREATED`.
- Execute `Create Proposal`.
- Confirm the proposal is created from the new opportunity chain.
- Log in as CEO and confirm `opportunity.create` / `opportunity.created` appear in `/audit/events`.
