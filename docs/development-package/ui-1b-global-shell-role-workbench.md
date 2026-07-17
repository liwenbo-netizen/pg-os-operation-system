# UI-1B Global Shell and Role Workbench Foundation

## Objective

Establish a reusable operating-page grammar for PG OS without changing workflow services, RBAC, RLS, repository behavior, or audit contracts.

## Delivered

### Shared operating-page components

- `OperatingPageHeader`
- `NextActionBar`
- `MetricStrip`
- `GuidedEmptyState`
- `WorkspaceLayout`

These components standardize page identity, state-derived guidance, owner/blocker/due-date visibility, compact decision metrics, and queue-detail-context layout.

### Global shell

- consolidated auth, repository diagnostics, language, and sign-out into one System status panel;
- reduced the mobile header to navigation, compact page identity, role selection, and System status;
- changed static route guidance from Recommended next step to Page focus so it is not confused with record-level guidance;
- added application-level horizontal overflow protection while preserving local table scrollers;
- kept role-aware navigation, route search, breadcrumbs, diagnostics, and route permissions unchanged.

### CEO and Role Workbench

- moved current task guidance above metrics;
- shows task status, next action, owner, blocker, and due date without scrolling;
- reduced the first-view metric strip from five cards to four decision signals;
- removed the duplicate Start command from task detail;
- uses one state-aware Start task or Continue task command;
- disables Start for blocked tasks and exposes the blocker in the decision strip;
- converted queue, selected task, OKR, risks, events, and empty states to the shared page contract;
- preserved `startTask`, `completeTask`, `updateOkrProgress`, route handoff, and audit behavior.

### Localization

- localized all shell and Workbench framework copy added by UI-1B;
- localized task/OKR status labels, empty states, metric labels, system controls, and guard feedback;
- retained stable workflow codes and business data values.

## Verification

- TypeScript: passed with `npm.cmd run lint`.
- Focused regression: 23 tests passed.
- Full regression: 50 files and 229 tests passed.
- Production build: passed.
- Desktop browser: verified at the default 1280 x 720 viewport.
- Mobile browser: verified at 390 x 844.
- Mobile width evidence: `innerWidth=390`, `document.scrollWidth=375`, `body.scrollWidth=375`.
- Mobile header controls remained inside the viewport.
- Mobile System status panel measured 343 px wide inside the 390 px viewport.

## Known non-blocking build note

The generated JavaScript bundle remains above Vite's 500 kB advisory threshold. This predates UI-1B and should be handled as a later code-splitting performance phase rather than mixed into the interaction redesign.

## Boundaries preserved

- no database migration;
- no Supabase policy change;
- no domain status change;
- no route capability change;
- no workflow service rewrite;
- no audit schema change.

## Recommended next phase

Proceed with **UI-1C Media and Ecosystem Operations**:

1. make Operations and Insights separate views;
2. move queue/list/detail before aggregate track and pipeline insights;
3. collapse advanced filters;
4. keep one selected-record primary action;
5. localize tracks, stages, filters, batch actions, and empty states;
6. verify Media Manager and Media Director on desktop and mobile.
