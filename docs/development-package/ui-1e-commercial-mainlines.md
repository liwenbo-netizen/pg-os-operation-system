# UI-1E Commercial Mainlines

## Objective

Align Sales, Finance, and Contract workspaces around one guided operating decision, a visible business-stage path, and a separate evidence surface without changing workflow services, repository contracts, RBAC, RLS, audit events, or stored domain enums.

## Delivered

### Shared operating pattern

- introduced a reusable business-stage path for complete, active, blocked, and pending states;
- applies the shared operating header, metric strip, and next-action bar across the three commercial mainlines;
- exposes one recommended action, accountable owner, current blocker, and due-date context before supporting detail;
- keeps secondary and exception commands available without competing with the primary workflow action.

### Sales mainline

- turns the empty Sales Manager workspace into a guided advertiser-to-opportunity entry flow;
- orders opportunity actions from proposal creation to proposal approval and campaign creation;
- orders campaign actions from media allocation to checklist completion and launch approval;
- preserves trusted-supply recommendations and explicit media selection as supporting decisions;
- localizes advertiser, opportunity, proposal, campaign, readiness, and guard feedback at the presentation layer.

### Finance settlement mainline

- orders settlement actions from reconciliation to confirmation, invoice issue, and payment completion;
- separates daily operations from diagnostics and activity evidence;
- localizes settlement statuses, queue guidance, actions, blockers, and empty states;
- removes duplicate action buttons while preserving every existing finance workflow command.

### Contract mainline

- orders contract actions from legal review to finance review, finance approval, legal approval, signing, and archive;
- restores the missing requested-to-legal-review operating entry through the existing service command;
- distinguishes the normal contract path from redline exception controls;
- separates linked-record evidence and activity history from daily contract operations;
- localizes contract statuses, risk, ownership, actions, blockers, and empty states.

### Guard and status presentation

- adds a display-only guard-message adapter for common Sales, Finance, and Contract feedback;
- retains service messages, reason codes, repository payloads, audit event names, and stored enums unchanged;
- adds deterministic page models and unit tests for each primary-action sequence.

## Verification

- TypeScript: passed with `npm.cmd run lint`.
- Focused page-model and workflow regression: 7 files and 32 tests passed.
- Full regression: 55 files and 244 tests passed.
- Production build: passed.
- Desktop browser: Sales empty-entry flow created an advertiser and opportunity, then exposed a single proposal action.
- Desktop browser: Finance and Contract localized empty states rendered correctly under their role workspaces.
- Mobile browser: Contract Workspace verified at 390 x 844 with navigation, role switcher, context action, title, and empty state visible without overlap.

## Boundaries preserved

- no database migration;
- no Supabase policy change;
- no route capability change;
- no stored domain enum change;
- no workflow service rewrite;
- no audit schema or event change;
- no production data write during visual verification.

## Known non-blocking build note

The generated JavaScript bundle remains above Vite's 500 kB advisory threshold. The current artifact is approximately 935 kB before gzip and 236 kB after gzip. Route-level code splitting should be handled as a dedicated performance phase so it does not obscure workflow UX changes.

## Recommended next phase

Proceed with **UI-1F Cross-Module Handoff and Command-Center Alignment**:

1. make upstream and downstream records visible when Sales hands work to Finance or Contract;
2. align command-center cards with the same next-action, owner, blocker, and due-date language;
3. add consistent deep links from workbench tasks into the selected business record;
4. keep audit evidence available without placing it in the primary operating path;
5. complete production role-session UAT after deployment.
