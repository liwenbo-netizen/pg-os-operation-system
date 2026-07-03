# Phase 38 Report - User-Assisted Live-Write UAT / RLS & Audit Proof

Status: PASS for the Media Manager production live-write path, the Sales Manager fixed production rerun, and CEO audit proof. The original Sales opportunity advertiser context defect was reproduced, fixed, redeployed, and verified through live Supabase audit events.

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
- Sales follow-up rerun: `New advertiser`, `Create opportunity`, `Create Proposal`

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
- `opportunities`
- `proposals`
- proposal publisher guard evaluation
- `audit_logs`
- `module_business_events`

The CEO audit stream proved both audit-log style allowed events and business-event style domain events are readable from production for Media and Sales. The follow-up Sales rerun also proved the complete advertiser -> opportunity -> proposal chain.

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
- Sales Manager opportunity creation originally revealed missing advertiser context binding. FAIL - historical defect reproduced and recorded.
- Sales Manager opportunity creation after fix creates a live opportunity from the active advertiser context. PASS.
- Sales Manager can create a proposal from the existing opportunity path. PASS.
- Sales Manager follow-up proposal creation stays on the newly created opportunity chain. PASS.
- Sales Manager media validation guard records blocked selection without RLS warning. PASS.
- Sales write and guard events are visible in `/audit/events`. PASS.
- Sales follow-up advertiser/opportunity/proposal audit chain is visible in `/audit/events`. PASS.
- Audit timestamps display as `UTC+8`. PASS.
- No password was typed or retained by Codex. PASS.

## Next Recommended Scope

Continue Phase 38 with the remaining live-write UAT roles:

- Finance Manager: reconciliation, confirmation guard, invoice/payment progression.
- Legal Manager: finance review, legal approval, signing/archive guard.

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

Production follow-up checklist executed after deployment:

- Log in as `sales_manager@poly-gamma.com`.
- Execute `New advertiser`.
- Execute `Create opportunity`.
- Confirm `OPPORTUNITY_CREATED`.
- Execute `Create Proposal`.
- Confirm the proposal is created from the new opportunity chain.
- Log in as CEO and confirm `opportunity.create` / `opportunity.created` appear in `/audit/events`.

## Sales Follow-Up Production Rerun

Recorded at: 2026-07-04 02:04:06 +08:00.

Session:

```text
Account: sales_manager@poly-gamma.com
Active role: Sales Manager
Auth mode: Supabase auth
Initial repository state: Supabase synced
```

Executed actions after the deployed fix:

| Action | Browser feedback | Result |
| --- | --- | --- |
| New advertiser | `ADVERTISER_CREATED` | PASS |
| Create opportunity | `OPPORTUNITY_CREATED` | PASS |
| Create Proposal | `PROPOSAL_CREATED` | PASS |

Observed production data:

```text
Advertisers: 13 -> 14
Opportunities: 1 -> 2
Proposals: 1 -> 2
Created opportunity: Daily Yoga Retention Push
Created proposal: Daily Yoga Retention Push Proposal
Repository state after writes: Supabase synced
Supabase warning count: 0
```

Fix verification result:

```text
The previous NOT_FOUND / Advertiser was not found failure did not recur.
Create opportunity used the active advertiser context and created a live opportunity record.
Create Proposal stayed on the newly created opportunity chain.
```

## CEO Sales Follow-Up Audit Proof

Session:

```text
Account: ceo@poly-gamma.com
Active role: CEO
Audit route: /audit/events
Audit source: Supabase live
Loaded at: 2026-07-04 02:04:06 UTC+8
Supabase warning count: 0
```

Verified Sales rerun audit and business events:

| Event | Module | Object | Status | Created |
| --- | --- | --- | --- | --- |
| `advertiser.create` | Sales | advertiser `4cf4cc16-33ad-418a-8a16-bb68e9659990` | allowed | 2026-07-04 02:01:50 UTC+8 |
| `advertiser.created` | Sales | advertiser `4cf4cc16-33ad-418a-8a16-bb68e9659990` | business | 2026-07-04 02:01:50 UTC+8 |
| `opportunity.create` | Sales | opportunity `d59c6cb2-bee1-4ec3-a2fb-36dbc0365ec6` | allowed | 2026-07-04 02:01:53 UTC+8 |
| `opportunity.created` | Sales | opportunity `d59c6cb2-bee1-4ec3-a2fb-36dbc0365ec6` | business | 2026-07-04 02:01:53 UTC+8 |
| `proposal.create` | Sales | proposal `6346e337-b847-4a18-8e69-de0624ad5360` | allowed | 2026-07-04 02:01:57 UTC+8 |
| `proposal.created` | Sales | proposal `6346e337-b847-4a18-8e69-de0624ad5360` | business | 2026-07-04 02:01:57 UTC+8 |

The Sales rerun now has the full advertiser -> opportunity -> proposal audit chain. This closes the previously recorded Sales opportunity context defect for Phase 38.
