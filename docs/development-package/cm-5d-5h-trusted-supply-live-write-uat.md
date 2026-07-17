# CM-5D to CM-5H Trusted Supply Live-Write UAT

## Result

Status: passed

Production URL: `https://pg-os-operation-system.vercel.app/`

Recorded at: 2026-07-17 17:22 UTC+8

## Roles

- Integration Manager
- AdOps Manager
- Media Manager
- Media Director
- Sales Manager
- Data Analyst
- CEO

## Production evidence

1. CM-5D completed nine production integration-execution checks covering technical evidence, blocker lifecycle, readiness submission, route binding, and CEO audit proof.
2. AdOps Manager completed the QuZhi Campus controlled commercial test at Fill 62%, Clear 72%, and IVT 1.8%.
3. The commercial-test status sync migration aligned `commercial_tests.status` and `publishers.commercial_test_status` without granting AdOps broad publisher-table access.
4. Media Manager evaluated QuZhi Campus at 59 before commercial completion and 77 after completion. The final level was A with a Core recommendation and no automatic pool grant.
5. Media Director confirmed the Core pool, created a controlled supply package, and activated it.
6. Sales Manager received the active QuZhi Campus recommendation with match score 96 and suggested budget share 35%.
7. Data Analyst received `Review trusted supply quality: QuZhi Campus` in Role Workbench.
8. CEO verified allowed and business events for evaluation, pool confirmation, package creation, and package activation with UTC+8 timestamps.

## Audit markers

- `commercial_test.conclude`
- `publisher.commercial_test_passed`
- `trusted_supply.evaluate`
- `trusted_supply.score_evaluated`
- `trusted_supply.pool.confirm`
- `trusted_supply.pool_confirmed`
- `trusted_supply.package.create`
- `trusted_supply.package_created`
- `trusted_supply.package.activate`
- `trusted_supply.package_activated`

## Acceptance

CM-5D through CM-5H are accepted as a production live-write UAT pass. Routine monitoring remains active for score trend, IVT, diagnostic blockers, and package quality.
