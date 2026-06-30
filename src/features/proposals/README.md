# Proposals Feature

Proposal workflows must use the shared publisher readiness guard.

Phase 5 implements:

- Proposal creation from opportunity context.
- Publisher selection through `canSelectPublisherForProposal`.
- Allowed, warning, and blocked media selection states.
- Sales Director proposal approval through `canApproveProposal`.

Blocked publishers are recorded in proposal media selections but are not added to the proposal's selected publisher list.
