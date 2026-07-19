# UI-1G Commercial Publisher Onboarding

## Objective

Replace the placeholder `New publisher` action with an operational onboarding package for programmatic media supply. The workflow collects the minimum evidence needed to continue Publisher 360 readiness without turning PG OS into an SSP, exchange, or bidding platform.

## Four-step workflow

1. Identity and property: partner name, legal entity, market, property type, app/site/channel name, package/bundle/domain/AppID, planned integration method.
2. Traffic evidence: DAU, optional MAU, daily ad requests, evidence date, evidence source.
3. Inventory: first ad slot, ad format, placement, creative specification, slot request volume, floor price, currency.
4. Commercial and contact: primary business contact, contract type, billing model, settlement cycle, payment terms, revenue share.

The wizard validates each stage before proceeding. A final submission creates one internally consistent onboarding package and then opens the new Publisher 360 record.

## Persistence mapping

- `publishers`: identity, legal entity, region, media type, integration type, DAU, daily requests, and property/traffic metadata.
- `publisher_contacts`: primary contact name, role, email, and phone.
- `publisher_ad_slots`: slot identity, format, placement, request volume, floor price, currency, and creative specification.
- `publisher_contract_terms`: contract type, billing model, settlement cycle, payment terms, revenue share, and currency.
- `integration_projects`: initial technical project created in `not_started` state.

No migration is required. The implementation uses existing structured columns and the existing JSON metadata columns for property and evidence fields.

## Authorization and audit

The service performs all capability and table-write checks before the first write. This prevents invalid input or a denied role from leaving partial onboarding records.

Audit coverage includes the underlying record events plus `publisher.onboarding.create`. The business event `publisher.onboarding_created` identifies successful package creation and retains the created publisher as the trace object.

## UX behavior

- The manager workbench opens a responsive modal instead of creating demo data.
- Desktop uses a two-column operational form; mobile uses a single-column scroll region with a stable action bar.
- Inline validation is localized and announced through `role="alert"`.
- The final action remains explicit; no test or preview interaction writes data until `Create onboarding package` is submitted.

## Verification

- Model tests cover required fields and input conversion.
- Service tests cover complete package creation and zero partial writes on invalid input.
- Supabase repository tests cover all new mapped fields.
- Business audit and UAT coverage tests include the new onboarding action.
- Desktop and 390 px mobile browser checks cover layout, validation, and step navigation without submitting data.

## Production live UAT

- Media Manager created `PGOS UAT Publisher 226568` in production with a complete identity, traffic, inventory, contact, commercial, and integration package.
- Publisher count increased from 20 to 21 and repository health remained `Supabase synced` with zero warnings.
- CEO Audit Events showed the main onboarding event, all child write events, and matching business events for publisher object `c09b8bca-d733-4225-bb4f-bedc0b12d82b`.
- The UAT exposed a UTC date-boundary issue in the traffic evidence default. The wizard now derives its default calendar date in UTC+8 rather than slicing a UTC ISO timestamp.

## Phase 2: profile governance and technical handoff

Publisher 360 now supports a governed correction flow instead of treating onboarding data as immutable:

- `Edit profile` reopens the four-step wizard with the existing publisher, primary contact, primary ad slot, initial commercial term, traffic evidence, and integration method prefilled.
- Saving updates the existing record IDs and preserves the current technical, commercial, trusted-supply, and sales-readiness state.
- Missing primary child records or an integration project are repaired as part of the same governed update package.
- Successful updates emit `publisher.onboarding.update` plus publisher, contact, ad-slot, and contract-term update audit events and matching business events.
- Publisher 360 exposes a direct technical-integration handoff. Media Manager can inspect the handoff page, while technical write actions remain capability-gated to roles with `integration.manage`.

Duplicate governance runs before any child record is created or updated. Publisher names are compared case-insensitively with normalized whitespace. Package names, bundle IDs, domains, AppIDs, and other property identifiers are compared case-insensitively; web domains additionally ignore protocol, `www`, paths, query strings, and fragments. A duplicate returns `PUBLISHER_NAME_DUPLICATE` or `PUBLISHER_IDENTIFIER_DUPLICATE` without creating partial data.

The current duplicate guard is enforced in the domain service used by both mock and Supabase workflows. A database unique index is intentionally deferred until legacy duplicate publisher records have been reviewed and normalized; applying one before that cleanup could block full-snapshot persistence for existing UAT data.

Phase 2 verification covers duplicate zero-write behavior, update ID preservation, technical-project preservation, edit-draft hydration, complete profile readiness, route handoff, localized UI, desktop layout, and 390 px mobile layout.
