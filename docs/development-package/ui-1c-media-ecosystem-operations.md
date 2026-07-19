# UI-1C Media Ecosystem Operations

## Objective

Turn China Media Ecosystem Expansion from a dashboard-first screen into a guided operating workspace without changing workflow services, RBAC, RLS, repository behavior, audit contracts, or stored domain enums.

## Delivered

### Operations and Insights

- Operations is the default view for Media Manager and Media Director;
- Insights isolates strategic track coverage and pipeline distribution as a read-only decision surface;
- operational queue, opportunity list, selected record, owner, blocker, and next action now appear before aggregate analysis;
- queue cards were reduced to a compact horizontally scrollable queue selector.

### Selected-record guidance

- introduced a deterministic UI-only primary-action model;
- shows one recommended action based on owner, review, score, outreach, gate, candidate, readiness, and handoff state;
- keeps all existing workflow commands available in a collapsed secondary action area;
- exposes current stage, owner, first blocker, and timing context in the shared decision strip;
- preserves every existing service call and workflow guard.

### Filters and batch actions

- keeps search visible for daily use;
- moves track, stage, score, owner, review, and seed-confidence filters into a collapsed advanced-filter section;
- keeps active filter visibility and reset behavior;
- moves batch owner assignment and batch review into a collapsed controlled action section;
- preserves the 50-record batch limit and existing guard behavior.

### Localization

- localized all 16 ecosystem tracks and 11 expansion stages;
- localized queue labels, queue guidance, gaps, filters, batch actions, review panels, score criteria, gate checks, candidate statuses, blockers, and empty states;
- retains English enum values and repository payloads;
- includes localized track names in opportunity search.

### Responsive behavior

- opportunity list and detail stack on narrow screens;
- queue selector uses local horizontal scrolling instead of widening the document;
- advanced filters remain within the mobile content width;
- desktop retains the list-detail operating pattern.

## Verification

- TypeScript: passed with `npm.cmd run lint`.
- Focused page-model, i18n, and ecosystem regression: 19 tests passed.
- China Media validation: 24 tests passed.
- Full regression: 51 files and 232 tests passed.
- Production build: passed.
- Desktop browser: verified at the default 1280 px viewport.
- Mobile browser: verified at 390 x 844.
- Mobile width evidence: `innerWidth=390`, `document.scrollWidth=375`, `clientWidth=375`.
- Expanded mobile filters: six controls rendered with no document horizontal overflow.

## Boundaries preserved

- no database migration;
- no Supabase policy change;
- no domain enum change;
- no route capability change;
- no workflow service rewrite;
- no audit schema or event change;
- no production data write during visual verification.

## Known non-blocking build note

The generated JavaScript bundle remains above Vite's 500 kB advisory threshold. This predates UI-1C and remains a separate code-splitting performance task.

## Recommended next phase

Proceed with **UI-1D Publisher 360 and Media Mainline**:

1. apply the same next-action decision strip to Publisher 360;
2. separate onboarding operations from evidence and history;
3. consolidate technical, commercial, trusted-supply, and handoff status into one readiness path;
4. improve empty and blocked states for Media Manager and Integration Manager;
5. verify production Media Manager and Media Director sessions after deployment.
