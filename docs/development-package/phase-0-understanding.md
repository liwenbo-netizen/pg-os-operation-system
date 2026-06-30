# Phase 0 Understanding

This repo is based on `PGOS_AI_DEVELOPMENT_PACKAGE_V2.11_ZERO_BUILD_CLEANED`.

## Product Position

PG OS supports publisher onboarding, advertiser development, proposals, campaigns, diagnostic cases, finance settlement, contracts, OKR, SOP, audit, and cross-role collaboration.

PG OS is not a DSP, SSP, ADX, RTB server, IVT algorithm platform, ERP, CRM, or generic OA approval system.

## Locked Technical Direction

- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS and component equivalents
- Backend: Supabase Postgres with RLS and service layer
- Auth: Supabase Auth
- Validation: Zod
- Data fetching: TanStack Query
- Testing: Vitest and Playwright

## Locked Controls

- API responses use `ApiResponse<T>` with `data`, `error`, optional `meta`, and `trace_id`.
- Status values must come from the locked enum catalog.
- Publisher readiness has three independent layers: technical live, commercial test, and sales scale.
- Proposal, campaign, scale, diagnostic, and settlement transitions must be guard-backed.
- `system_admin` is system administration only, not a business approval role.

