# UI-1D Publisher Readiness Mainline

## Objective

Turn Publisher 360 into a guided media-readiness workspace that connects profile, technical integration, commercial validation, trusted-supply qualification, and active supply without changing workflow services, repository contracts, RBAC, RLS, audit events, or stored domain enums.

## Delivered

### One primary operating action

- introduced a deterministic UI-only publisher readiness model;
- selects one primary action in business order: ad slot, commercial terms, technical integration, commercial test, trust evaluation, pool confirmation, supply package creation, and package activation;
- shows owner, blocker, readiness state, and due-date context in the shared decision strip;
- preserves every existing workflow command, guard, and audit event.

### Unified readiness path

- consolidates profile foundation, technical readiness, commercial validation, trusted qualification, and active supply into one five-step path;
- distinguishes complete, active, blocked, and pending states;
- keeps operational metrics and blockers next to the readiness decision;
- gives Media Manager and Media Director the same sequence while retaining role guards.

### Three focused views

- **Readiness** is the default operating view and contains the next action, readiness path, publisher metrics, and current evidence counts;
- **Trusted supply** contains explainable scoring, human pool confirmation, controlled packaging, and quality monitoring;
- **Evidence and history** contains contacts, integration evidence, commercial-test evidence, and diagnostics;
- tabs change presentation only and do not mutate workflow state.

### Status and localization alignment

- localized technical, commercial, sales-readiness, trusted-quality, supply-pool, and package statuses;
- localized Media Manager queue guidance and Media Director blocking cases;
- localized Publisher 360 action titles and the first trusted-supply quality guidance;
- retains stable English domain values, reason codes, repository payloads, and audit contracts.

### Responsive behavior

- desktop keeps the publisher queue and selected publisher in a list-detail layout;
- mobile stacks the queue, publisher header, decision strip, path, and evidence sections;
- the three-view control fits within the mobile content width;
- no fixed-format control widens the document.

## Verification

- TypeScript: passed with `npm.cmd run lint`.
- Focused page-model, i18n, media-workflow, and trusted-supply regression: 19 tests passed.
- Trusted Supply validation gate: 6 files and 43 tests passed.
- Full regression: 52 files and 235 tests passed.
- Production build: passed.
- Desktop browser: verified at the default 1280 px viewport.
- Desktop width evidence: `innerWidth=1280`, `document.scrollWidth=1265`.
- Mobile browser: verified at 390 x 844.
- Mobile width evidence: `innerWidth=390`, `document.scrollWidth=375`, `tablistWidth=342`, `tablistClientWidth=342`.
- Readiness, Trusted supply, and Evidence and history views were each opened and inspected.

## Boundaries preserved

- no database migration;
- no Supabase policy change;
- no route capability change;
- no domain enum change;
- no workflow service rewrite;
- no audit schema or event change;
- no production data write during visual verification.

## Known non-blocking build note

The generated JavaScript bundle remains above Vite's 500 kB advisory threshold. The current artifact is approximately 913 kB before gzip and 228 kB after gzip. This remains a separate route-level code-splitting performance task.

## Recommended next phase

Proceed with **UI-1E Sales, Finance, and Contract Mainline Alignment**:

1. apply the same one-primary-action pattern to Sales Manager, Finance Settlement, and Contract Workspace;
2. distinguish daily operations from evidence and approval history;
3. expose handoff owner, blocker, due date, and upstream/downstream object context consistently;
4. preserve existing workflow services and role guards;
5. verify desktop, mobile, and production role sessions after deployment.
