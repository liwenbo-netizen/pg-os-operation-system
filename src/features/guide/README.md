# Guide Feature

The guide center exposes searchable role and scenario SOP cards.

Phase 9 implements:

- Search SOP cards by keyword, module, and active role.
- Recommend published SOP cards for the signed-in role.
- Open SOP cards and record activity.
- Create SOP drafts through `SopService`.
- Publish SOP cards only when steps exist.
- Update SOP steps and increment version numbers.

All writes go through `SopService`; read-only and unrelated roles remain blocked from restricted SOP actions.
