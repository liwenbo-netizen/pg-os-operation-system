# Advertisers Feature

Phase 5 implements the first advertiser and opportunity mainline:

- Create advertiser through `SalesWorkflowService`.
- Create opportunity linked to an advertiser.
- Convert opportunity into a Proposal draft.
- Emit guard audit events and business events for mutating actions.

Current implementation is in-memory and UAT-fixture backed until Supabase repositories are wired.
