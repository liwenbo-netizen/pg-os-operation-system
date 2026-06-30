# Workbench Feature

Phase 10 implements service-backed role workbenches:

- `/workbench` renders a role-specific task queue.
- `/ceo/dashboard` renders the executive operating dashboard.
- Tasks are aggregated from workflow fixture state and derived from live in-memory workflow state.
- Task start and completion go through `WorkbenchService`.
- Blocked tasks cannot be completed until their blocker is resolved.
- Recent business events from Media, Sales, Finance, Contracts, and Guide are surfaced in the workbench.
