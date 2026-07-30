-- SDK-2B: classify technical projects by traffic channel and integration depth.
-- Detailed playbooks and executable checks remain source-controlled. The profile
-- stores the agreed route and the media's assessed technical capabilities.

alter table public.integration_project_profiles
  add column if not exists traffic_channel text,
  add column if not exists integration_mode text,
  add column if not exists protocol_codes text[],
  add column if not exists capability_profile jsonb;

update public.integration_project_profiles
set
  traffic_channel = coalesce(
    traffic_channel,
    case when platform = 'android_tv' then 'ctv' else 'mobile' end
  ),
  integration_mode = coalesce(
    integration_mode,
    case
      when 'origin_ivt_android_v11' = any(playbook_codes) then 'ivt_sdk_api'
      else 'full_sdk'
    end
  ),
  protocol_codes = coalesce(
    protocol_codes,
    case
      when platform = 'android_tv' and 'origin_ivt_android_v11' = any(playbook_codes)
        then array['vast', 'api']::text[]
      when 'origin_ivt_android_v11' = any(playbook_codes)
        then array['api']::text[]
      else array['native_sdk']::text[]
    end
  ),
  capability_profile = coalesce(
    capability_profile,
    jsonb_build_object(
      'has_ad_server', 'origin_ivt_android_v11' = any(playbook_codes),
      'has_ad_player', platform = 'android_tv',
      'has_ad_sdk', 'origin_ivt_android_v11' = any(playbook_codes),
      'supports_api', 'origin_ivt_android_v11' = any(playbook_codes),
      'supports_openrtb', false,
      'supports_vast', platform = 'android_tv' and 'origin_ivt_android_v11' = any(playbook_codes),
      'supports_lifecycle_events', 'origin_ivt_android_v11' = any(playbook_codes),
      'accepts_ivt_sdk', 'origin_ivt_android_v11' = any(playbook_codes),
      'requires_pg_full_sdk', not ('origin_ivt_android_v11' = any(playbook_codes))
    )
  );

alter table public.integration_project_profiles
  alter column traffic_channel set default 'mobile',
  alter column traffic_channel set not null,
  alter column integration_mode set default 'full_sdk',
  alter column integration_mode set not null,
  alter column protocol_codes set default '{}'::text[],
  alter column protocol_codes set not null,
  alter column capability_profile set default '{}'::jsonb,
  alter column capability_profile set not null;

alter table public.integration_project_profiles
  drop constraint if exists chk_integration_profile_traffic_channel,
  add constraint chk_integration_profile_traffic_channel check (
    traffic_channel in ('mobile', 'ctv', 'dooh', 'pc', 'connected_device')
  ),
  drop constraint if exists chk_integration_profile_integration_mode,
  add constraint chk_integration_profile_integration_mode check (
    integration_mode in ('ivt_sdk_api', 'full_sdk', 'lightweight_sdk_api', 'player_component')
  ),
  drop constraint if exists chk_integration_profile_protocol_codes,
  add constraint chk_integration_profile_protocol_codes check (
    protocol_codes <@ array[
      'api',
      'openrtb',
      'vast',
      'private_protocol',
      'javascript_sdk',
      'native_sdk',
      'device_protocol'
    ]::text[]
  ),
  drop constraint if exists chk_integration_profile_capability_object,
  add constraint chk_integration_profile_capability_object check (
    jsonb_typeof(capability_profile) = 'object'
  );

comment on column public.integration_project_profiles.traffic_channel is
  'Primary inventory channel: mobile, ctv, dooh, pc, or connected_device.';
comment on column public.integration_project_profiles.integration_mode is
  'Agreed integration depth: IVT plus API, full SDK, lightweight SDK plus API, or player component.';
comment on column public.integration_project_profiles.protocol_codes is
  'Approved delivery protocols selected during route assessment.';
comment on column public.integration_project_profiles.capability_profile is
  'Media capability assessment used to gate and scope the executable checklist.';

drop policy if exists integration_check_results_write_operators
  on public.integration_check_results;

create policy integration_check_results_write_operators
on public.integration_check_results for all
using (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
  or (owner_role = 'media_manager' and public.has_role('media_manager'))
  or (owner_role = 'legal_manager' and public.has_role('legal_manager'))
  or (owner_role = 'data_analyst' and public.has_role('data_analyst'))
  or (owner_role = 'adops_manager' and public.has_role('adops_manager'))
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
  or (owner_role = 'media_manager' and public.has_role('media_manager'))
  or (owner_role = 'legal_manager' and public.has_role('legal_manager'))
  or (owner_role = 'data_analyst' and public.has_role('data_analyst'))
  or (owner_role = 'adops_manager' and public.has_role('adops_manager'))
);

comment on policy integration_check_results_write_operators
  on public.integration_check_results is
  'Integration leadership supervises all checks; Media, Legal, Data, and Ad Operations update only checks assigned to their role.';
