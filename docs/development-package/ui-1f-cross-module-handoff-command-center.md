# UI-1F Cross-Module Handoff and Command-Center Alignment

## Objective

Expose the business relationships already present in PG OS so a task is no longer an isolated queue item. Align the CEO and Media Director command surfaces with the same next-action, owner, blocker, due-date, and record-context language used by the operating workspaces.

## Delivered

### Cross-module handoff model

- introduced a UI-only relationship model for advertiser, opportunity, proposal, campaign, publisher, ecosystem lead, trusted-supply candidate, integration, diagnostic, settlement, and contract records;
- derives upstream, current, and downstream nodes from existing workflow state and task source bindings;
- supports Sales to Campaign to Finance and Contract chains;
- supports ecosystem lead to trusted candidate to Publisher 360 and technical integration chains;
- does not add denormalized relationship fields or alter repository payloads.

### Role Workbench context

- adds a business handoff context section to the selected task;
- provides guarded deep links to accessible upstream, current, and downstream records;
- explains when the current role cannot open a linked route instead of silently navigating;
- localizes task modules, object types, relationship directions, and empty-link states;
- preserves task start, completion, audit, and derived-task persistence behavior.

### Sales deep-link binding

- passes the selected workbench object into Sales Manager, Proposal, and Campaign pages;
- selects the real opportunity, proposal, or campaign after task navigation;
- keeps direct queue navigation bound to the selected record id;
- removes the previous route-only navigation ambiguity.

### CEO command surface

- adds a compact cross-module operating-handoff table above the task workspace;
- summarizes active, P0, and blocked work by module;
- focuses the task queue on the next accountable item without starting or mutating it;
- retains the detailed task, relationship context, risks, recent events, and OKR sections below.

### Media Director command center

- replaces three equal approval buttons with one sequential sales-readiness decision;
- presents limited sellable, proposal selectable, and scale ready as a visible approval path;
- blocks approval while sales-readiness diagnostics remain unresolved;
- keeps one selected publisher, its readiness evidence counts, and Publisher 360 handoff visible;
- disables the Publisher 360 action when no publisher is selected;
- removes the unrelated New Publisher command from director, integration, and commercial-test pages.

### Responsive and empty-state behavior

- command-center tables use local horizontal scrolling on narrow screens;
- relationship columns stack on mobile;
- stage paths distribute their actual number of steps instead of reserving five columns;
- CEO and Media Director empty repository states remain actionable and do not render blank detail areas.

## Verification

- TypeScript: passed with `npm.cmd run lint`.
- Focused workbench, command-center, Sales, and service regression: 5 files and 27 tests passed.
- Full regression: 57 files and 250 tests passed.
- Production build: passed.
- Desktop browser: CEO cross-module handoff table and empty task state rendered correctly.
- Desktop browser: Media Director command-center empty state rendered with localized guidance.
- Mobile browser: Media Director route, heading, empty state, and disabled invalid Publisher 360 action verified at 390 x 844.
- Relationship chains with business data were verified through deterministic fixture tests because the local Supabase snapshot contained no task or publisher rows.

## Production UAT follow-up

The first CEO production review confirmed that the cross-module table, task queue, selected-task detail, and handoff context were populated with real workflow data. It also exposed two presentation defects that were corrected without changing stored workflow records:

- generated workbench task titles and module badges now use localized display adapters in the Chinese interface while English and stored task data remain unchanged;
- the handoff context now opens the canonical business record route for the current object instead of reusing the task execution route.

The QuZhi Campus commercial-validation task was used as the regression case. Its current record now opens Publisher 360 at `/media/publishers/:id`, while starting the task still uses the commercial-test route. Focused tests, full regression, TypeScript validation, production build, and a local CEO browser walkthrough all passed after the correction.

## Boundaries preserved

- no database migration;
- no Supabase policy change;
- no stored domain enum change;
- no workflow service rewrite;
- no task lifecycle change;
- no audit schema or event change;
- no production data write during visual verification.

## Known non-blocking build note

The generated JavaScript bundle remains above Vite's 500 kB advisory threshold. The current artifact is approximately 955 kB before gzip and 240 kB after gzip. The increase makes route-level code splitting the next important technical UI task.

## Recommended next phase

Proceed with **UI-1G Production Visual UAT, Accessibility, and Route Splitting**:

1. deploy UI-1F and verify relationship chains with real CEO, Media Director, Sales, Finance, and Legal sessions;
2. run keyboard, focus, contrast, and screen-reader-name checks on shell, tables, tabs, and decision actions;
3. split major route pages into lazy-loaded chunks;
4. preserve the current operating hierarchy while reducing initial bundle cost;
5. record production screenshots and role-by-role acceptance results.
