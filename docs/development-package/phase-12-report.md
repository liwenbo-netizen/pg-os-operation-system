# Phase 12 Report - Supabase Auth / RLS Session Binding

Status: PASS

## Objective

Bind the PG OS role simulator to the real Supabase Auth / `profiles` / `user_roles` model while preserving local mock role login for prototype work.

## Implemented Scope

- Added `AuthSessionRepository` with local mock and Supabase implementations.
- Added Supabase password sign-in flow through `supabase.auth.signInWithPassword`.
- Added current-session bootstrap through `supabase.auth.getSession`.
- Bound authenticated Supabase users to `profiles.id = auth.uid()`.
- Loaded assigned PG OS roles from `user_roles`.
- Limited in-app role switching to assigned `user_roles` for Supabase sessions.
- Preserved full role switching for mock role simulator sessions.
- Added App Shell auth badge for Mock Auth / Supabase Auth and warning counts.
- Updated Login Page with Mock role and Supabase account modes.
- Added Phase 12 auth repository tests.

## RLS Policy Update

Changed `user_roles` read policy from privileged-only read to self-or-privileged read:

- A user can read rows where `user_roles.user_id = auth.uid()`.
- `system_admin`, `audit_viewer`, and `ceo` can still read user roles for privileged inspection.

This is required because the frontend must read the current user's assigned PG OS roles after Supabase Auth sign-in. Database writes remain controlled by the existing RLS policies and `public.has_role()` / `public.has_any_role()` helpers.

## Supabase Account Requirements

For a real Supabase login to enter PG OS:

- The Supabase Auth user must exist.
- `public.profiles.id` must match the Auth user id.
- `public.profiles.is_active` must not be false.
- `public.user_roles` must contain at least one PG OS role for the user.
- Requested active role is accepted only when that role is assigned to the user.

If no role is assigned, login returns a clear error and the user stays on the login page.

## Guardrails

- Mock login remains available when Supabase env is absent.
- Mock mode keeps all-role simulator switching for development.
- Supabase mode never grants an unassigned active role in the UI.
- Supabase RLS remains the hard control for database reads and writes.
- Existing workflow services still receive a `BusinessUser` with `roles` and `activeRole`, so Phase 3-11 guards continue to work.

## Validation

- `npm run validate:phase2`
- `npm run validate:phase12`
- `npm run test`
- `npm run lint`
- `npm run build`

## Next Recommended Phase

Create a Supabase UAT auth bootstrap script/runbook that provisions Auth users, inserts matching `profiles`, assigns `user_roles`, and verifies live RLS reads/writes with anon-session credentials.
