# Contracts Feature

Contract workflows are legal and finance collaboration surfaces, not a generic document store.

Phase 8 implements the first contract/legal mainline:

- Request contract review through `ContractService`.
- Start and approve Legal review.
- Request and approve Finance terms review.
- Send Legal redlines and preserve blocker context.
- Mark approved contracts signed and archive signed contracts.
- Block settlement-linked contract signing while a settlement dispute diagnostic case is open.

Current implementation is in-memory and fixture-backed. It is ready for a Supabase repository adapter because all page writes go through `ContractService`.
