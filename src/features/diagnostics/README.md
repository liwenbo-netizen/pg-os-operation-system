# Diagnostics Feature

Diagnostic cases must be able to affect readiness, settlement, and downstream work items.

Phase 6 implements the first diagnostic mainline:

- Create quality diagnostic cases through `DiagnosticWorkflowService`.
- Add evidence for funnel metrics, logs, publisher feedback, screenshots, or settlement files.
- Move cases through evidence collection, root-cause analysis, conclusion-ready, and closed states.
- Close cases only through `GuardService.canCloseDiagnosticCase`.
- Release publisher readiness and settlement blockers when diagnostic cases close.

The current page is fixture-backed and in-memory. Supabase repositories can replace the local state adapter in a later phase without changing page mutation contracts.
