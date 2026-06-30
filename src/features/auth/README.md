# Auth Feature

Phase 1 contains a role simulation login page. Phase 3 adds `AuthService` so tests and local UI can create a role-scoped user context before real Supabase Auth users exist.

Supabase Auth integration is wired in `src/lib/supabase.ts` and will be activated when seeded accounts exist.
