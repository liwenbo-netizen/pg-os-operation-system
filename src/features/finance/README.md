# Finance Feature

Settlement confirmation must be blocked by unresolved settlement dispute diagnostic cases.

Phase 6 verifies the unblock path: once a settlement dispute diagnostic case reaches `conclusion_ready` and is closed, `GuardService.canConfirmSettlement` allows finance confirmation for reconciled settlements.

Phase 7 implements the finance settlement mainline:

- Complete reconciliation and move settlements to pending review.
- Confirm settlement through `FinanceSettlementService.confirmSettlement`.
- Block confirmation while linked settlement dispute diagnostic cases remain open.
- Issue invoices only after settlement confirmation.
- Mark payment paid only after invoice issuance.

The current implementation is in-memory and fixture-backed. It is ready for a later Supabase repository adapter because page writes already go through `FinanceSettlementService`.
