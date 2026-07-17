# CM-5D to CM-5H Trusted Supply Operating Mainline

## Scope

This phase connects an onboarding candidate to technical execution, commercial validation, trusted supply qualification, controlled supply packaging, demand matching, and ongoing quality monitoring. It does not implement an exchange, auction, DSP, SSP, or real-time bidding.

## Phase coverage

| Phase | Operating outcome | Primary surface |
| --- | --- | --- |
| CM-5D | Technical evidence, blocker lifecycle, and readiness review | Technical Integration Wizard |
| CM-5E | Controlled commercial test plan, owner, thresholds, and conclusion | Commercial Test / Workbench |
| CM-5F | Explainable 100-point trust score and human pool confirmation | Publisher 360 / Workbench |
| CM-5G | Controlled supply package and advertiser-fit recommendation | Publisher 360 / Sales Workbench |
| CM-5H | Score trend, IVT, risk, and diagnostic blocker monitoring | Publisher 360 / Workbench |

## Locked business rules

1. A calculated score is a recommendation, not a trusted designation.
2. Only Media Director or Operations Director can confirm the operating pool.
3. Only confirmed Core or Test pool media can create a supply package.
4. Only an approval role can activate a package.
5. Active quality risk blocks package activation.
6. Pool confirmation never grants `scale_ready` automatically and never removes an existing valid `scale_ready` approval for a Core pool.
7. Sales consumes only active packages and receives reasons, risks, and a suggested budget share.

## Supabase migration order

Run these files in order in the Supabase SQL Editor:

1. `supabase/migrations/202607170001_commercial_validation_handoff.sql`
2. `supabase/migrations/202607170002_trusted_supply_qualification.sql`
3. `supabase/migrations/202607170003_trusted_supply_packages.sql`

All three migrations are idempotent at the table, column, policy, index, and trigger level.

## Automated validation

```powershell
npm.cmd run validate:trusted-supply
npm.cmd run build
```

## Production live-write UAT

Use one publisher that already passed CM-5D and has an active ad slot, commercial term, and passed commercial test.

1. Sign in as `adops_manager` or `data_analyst` and open Commercial Test.
2. Confirm the test shows owner, period, thresholds, metrics, and next action.
3. Sign in as `media_manager`, open Publisher 360, and run **Evaluate trust**.
4. Confirm the score, level, suggested pool, breakdown, reasons, risks, and quality signals appear. Confirm no pool has been granted yet.
5. Sign in as `media_director` and run **Confirm suggested pool**.
6. Run **Create supply package**, review the draft, then run **Activate package**.
7. Sign in as `sales_manager` and confirm the active package appears under Trusted supply recommendations with reasons, risks, match score, and suggested budget share.
8. Sign in as `data_analyst` and confirm Watch/At Risk/Suspended supply creates a quality task in Role Workbench.
9. Sign in as `ceo` and verify these actions in `/audit/events`:
   - `trusted_supply.evaluate`
   - `trusted_supply.pool.confirm`
   - `trusted_supply.package.create`
   - `trusted_supply.package.activate`
10. Record the outcome in `/uat/history` after all role checks pass.

## Rollback boundary

Pause or retire `media_supply_packages` first. Do not delete publishers, integration evidence, commercial tests, audit logs, or score history. If the feature must be hidden, revert the application deployment while retaining the three additive migrations.
