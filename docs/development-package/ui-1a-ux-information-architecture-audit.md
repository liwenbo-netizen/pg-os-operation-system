# UI-1A UX Information Architecture Audit

## Scope

UI-1A is a read-only audit of the current PG OS interface after the CM-5D to CM-5H business mainline was completed. It covers the global shell, role-aware routes, workbench, China Media Ecosystem Expansion, Media, Sales, Finance, Contract, Guide, observability, and UAT surfaces.

This phase does not change workflow rules, RBAC, RLS, database schema, repository behavior, or page styling.

## Executive conclusion

PG OS already has a sound application shell and broad workflow coverage. The usability problem is not missing navigation. It is inconsistent decision guidance inside pages:

- the shell knows the current route and role, but its recommended action is static route metadata rather than current-record state;
- pages lead with five or six metric cards before showing the user's actual queue or next action;
- business workspaces repeat similar three-column structures but do not share a formal page contract;
- empty states report that data is missing without explaining prerequisites, owner, or recovery action;
- the Chinese shell is substantially localized, while many page bodies, enum labels, filters, and empty states remain English;
- the 390 px ecosystem view has horizontal overflow and clipped header controls.

The next implementation should establish one operating-page grammar before redesigning individual modules.

## Current strengths to preserve

1. **Role-aware route catalog**
   `src/routes/routes.ts` centralizes allowed roles, page type, primary action, UAT reference, signals, and sections.

2. **Useful global navigation structure**
   `src/app/AppShell.tsx` already groups routes into My workspace, Media supply, Commercial operations, and Governance and support. It also provides page search, active state, breadcrumbs, role switching, language switching, and repository diagnostics.

3. **Reusable visual primitives**
   `SummaryCard` and `StatusBadge` provide consistent spacing, tone, and typography.

4. **Consistent business workspace pattern**
   Workbench, Finance, Contract, and Diagnostic pages already converge on queue, selected record, and right-rail context. This is a good base for a formal workspace layout.

5. **Strong operational concepts**
   Owner, blocker, next action, guard result, audit proof, task, and stage are already represented in domain services. UI-1 should expose these concepts more clearly rather than introduce new workflow rules.

## Findings and priorities

### P0 - Mobile shell overflow and clipped controls

At a 390 x 844 viewport, the China Media Ecosystem page produces horizontal scrolling. The top bar clips the role and repository controls, and the user cannot comfortably scan or operate the page with one vertical flow.

Required correction:

- guarantee `overflow-x: hidden` through the application frame without hiding legitimate table scrollers;
- replace the mobile top-bar control row with menu, compact page title, and one overflow menu;
- move role, language, auth, repository diagnostics, and sign-out into a mobile account/control sheet;
- verify 390 x 844, 768 x 1024, 1280 x 720, and 1440 x 900.

### P0 - Incomplete Chinese product language

The global shell and route titles translate correctly, but representative page bodies still show English text after selecting Chinese. Examples include Workbench descriptions and metrics, Finance empty states, ecosystem queue labels, strategic track labels, filters, batch controls, and raw workflow enums.

Required correction:

- all user-facing strings must use the localization layer;
- raw domain enums remain stable in code and database, but display through localized labels;
- Chinese and English should use the same information architecture and action meaning;
- acceptance should fail if a Chinese page shows an untranslated operational label, empty state, or button.

### P0 - Dead-end empty states

Finance Settlement, Contract Workspace, Workbench, and other pages can reduce to a title plus `No ... available`. The user is not told whether this is expected, whether filters are active, which prerequisite object is missing, or who should create it.

Every empty state needs:

- a plain explanation of why the queue is empty;
- the prerequisite or upstream workflow;
- the accountable role;
- one allowed recovery action, or a link back to the correct workbench;
- a non-actionable success state when zero work is genuinely the desired result.

### P1 - Static recommended action

The shell's recommended action comes from `route.primaryAction`. It can recommend `Create trusted supply candidate` while the page has zero leads and no eligible record. This weakens trust in the guidance.

UI-1 should distinguish:

- **route purpose**: stable metadata used for navigation and search;
- **current next action**: state-derived guidance from selected record, queue, guard, owner, and blocker;
- **primary command**: an enabled action only when its preconditions are satisfied.

### P1 - Metric-first pages delay the work

Many pages render five or six full cards before the queue. On smaller screens, the user must scroll through every metric before reaching actionable records. The colored backgrounds also give neutral counts the visual weight of alerts.

Required correction:

- show at most four compact decision metrics above the workspace;
- put the current stage, blocker count, due/age signal, and eligible-action count first;
- move secondary metrics into an expandable details area;
- reserve filled warning and danger surfaces for conditions that need attention.

### P1 - Weak hierarchy inside long workflows

China Media Ecosystem Expansion presents summary cards, seven operational queues, five track cards, eleven pipeline rows, six filters, batch controls, the opportunity list, and record detail in one continuous page. The capability is complete, but the primary operational path is buried.

Recommended hierarchy:

1. Queue tabs and active filters.
2. Opportunity list and selected opportunity detail.
3. Current next action, owner, blocker, and primary command.
4. Stage evidence and trusted-supply gate.
5. Strategic map and aggregate pipeline as a secondary Insights view.

### P1 - Repeated but informal page templates

Workbench, Finance, Contract, and Diagnostic pages use similar layouts with independently implemented panels and empty states. Media and Sales use related but different patterns. This creates inconsistent action placement, status density, and responsive behavior.

UI-1B should introduce shared layout primitives before module-specific redesign.

### P1 - Duplicate or competing actions

The Workbench exposes `Start selected task` in the page header and `Start` inside the selected task panel. Long workflow pages can also place commands far from the state they modify. Each state should have one visually primary action; repeated access may be sticky, but wording and behavior must remain identical.

### P2 - Raw operational codes

Stages such as `TECH_FEASIBILITY_CHECK` and statuses such as `onboarding_project_created` are valid domain values but poor display text. They should be mapped to localized labels with optional technical codes in diagnostics or audit detail.

### P2 - Card-heavy visual rhythm

Most sections and repeated items use bordered white cards with shadows. The result is visually tidy but flattens hierarchy: a key decision, a filter, an empty list, and an informational metric all look equally important.

Use unframed page bands for structure, borders for data regions, and cards only for repeated records, alerts, or genuinely framed tools.

## Recommended global information architecture

Preserve the current four sidebar groups:

1. **My workspace** - role dashboard, tasks, approvals, OKR/KPI.
2. **Media supply** - ecosystem expansion, publisher readiness, integration, tests, diagnostics.
3. **Commercial operations** - sales, proposal, campaign, finance, contract.
4. **Governance and support** - guide, system health, audit, UAT, administration.

Adjust the shell behavior:

- desktop sidebar remains persistent and searchable;
- mobile sidebar becomes a full-height drawer;
- desktop header contains page identity, role, locale, and one system-status entry;
- auth and repository detail merge into a single System status panel;
- the second header row shows breadcrumbs and a state-derived next-action summary;
- mobile moves secondary controls into an overflow menu.

## Standard operating page contract

Every P0/P1 business page should use the following sequence.

### 1. Page header

- localized page title and short business purpose;
- role or object context;
- current overall status;
- one primary command when allowed.

### 2. Decision strip

Always answer five questions without scrolling:

- What stage is this work in?
- What must happen next?
- Who owns it?
- What is blocking it?
- When is it due or how long has it waited?

### 3. Compact metric strip

Maximum four metrics that change the current decision. Secondary metrics move to Insights.

### 4. Primary workspace

- left: queue, filters, and saved operational views;
- center: selected record and state-changing actions;
- right: blocker, handoff, evidence, and recent activity;
- below 1280 px: right rail moves below the selected record;
- below 768 px: queue and detail become separate views instead of one long stacked page.

### 5. Evidence and history

Audit events, comments, handoffs, attachments, and decision evidence should be available from a consistent tab or drawer, not repeated as unrelated cards.

### 6. Guided empty state

Use one of four explicit variants: no work due, missing prerequisite, no permission, or no filter result.

## Shared UI primitives for UI-1B

Implement these as layout and guidance components, without changing service behavior:

- `OperatingPageHeader`
- `NextActionBar`
- `MetricStrip`
- `WorkspaceLayout`
- `QueuePanel`
- `ContextRail`
- `GuidedEmptyState`
- `GuardFeedback`
- localized `DomainStatusLabel`
- compact `SystemStatusMenu`

Existing `SummaryCard` and `StatusBadge` can remain for compatibility, then be migrated gradually.

## Phased implementation plan

### UI-1B - Global shell and role workbench foundation

- repair 390 px shell overflow and mobile control placement;
- consolidate auth/repository diagnostics into one system-status entry;
- add the shared page header, next-action bar, metric strip, and guided empty state;
- migrate CEO/Role Workbench first;
- complete Chinese strings for the shell and Workbench;
- retain all existing task execution and audit behavior.

### UI-1C - Media and ecosystem operations

- move ecosystem queue/list/detail before aggregate insights;
- collapse advanced filters;
- separate Operations and Insights views;
- provide sticky selected-record guidance and one primary action;
- localize media tracks, stages, gates, filters, and actions.

### UI-1D - Sales, Finance, Contract, and Diagnostic workspaces

- apply the common queue/detail/context template;
- standardize handoff, blocker, owner, due signal, and approval actions;
- replace dead-end empty states with prerequisite guidance;
- keep existing RLS, guard, and audit bindings unchanged.

### UI-1E - Guide, Observability, and UAT

- make Guide scenario-first and role-aware;
- keep dense audit/UAT tables horizontally scrollable inside their own region only;
- standardize filters, exports, evidence drill-down, and empty states;
- complete Chinese coverage.

### UI-1F - Cross-role production UAT

- execute Media Manager, Sales Manager, Finance Manager, Legal Manager, CEO, and Audit Viewer journeys;
- validate desktop, tablet, and mobile breakpoints;
- verify task start, route visit, business action, guard feedback, and audit trace;
- write results into UAT Result History.

## UI-1B acceptance gate

UI-1B is complete only when:

1. 390 x 844 has no page-level horizontal scrollbar.
2. Header controls do not overlap or clip at 390, 768, 1280, or 1440 px.
3. Workbench shows next action, owner, blocker, and task state above the fold when a task exists.
4. Workbench has one primary `Start task` command for the selected task.
5. Empty Workbench states explain whether there is no work or missing upstream data.
6. Chinese Workbench and shell contain no untranslated operational copy.
7. Mock and Supabase auth modes remain functional.
8. Role route visibility and task execution remain unchanged.
9. Existing audit writes continue to record task start and route visits.
10. Build, unit tests, and responsive browser checks pass.

## Boundaries

UI-1 must not:

- redesign domain statuses or workflow transitions;
- alter RLS or role capabilities;
- merge business modules;
- turn PG OS into an advertising transaction platform;
- remove audit, UAT, or system diagnostics;
- introduce decorative marketing layouts into operational pages;
- rewrite all pages in one release.

## Recommended next action

Proceed with **UI-1B: Global Shell and Role Workbench Foundation**. It has the highest cross-system leverage and creates the reusable contract needed for later Media, Sales, Finance, Contract, Guide, and UAT optimization.
