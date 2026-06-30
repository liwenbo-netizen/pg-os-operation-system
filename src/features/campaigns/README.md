# Campaigns Feature

Campaign launch workflows must use the shared publisher readiness guard.

Phase 5 implements:

- Campaign creation from proposal context.
- Publisher launch allocation through the campaign readiness guard.
- Launch checklist completion by campaign owner roles.
- Operations Director launch approval through `canApproveCampaignLaunch`.

Media allocation readiness is evaluated before final launch approval; the final approval still requires the launch checklist.
