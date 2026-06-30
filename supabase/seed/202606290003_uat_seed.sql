-- PG OS V2.11 UAT SEED DATA LOCKED
-- Requires profiles to be aligned with Supabase auth users in real deployment.

insert into public.roles(code, name, description, is_business_approval_role) values
('ceo','CEO','全局经营与风险查看',true),
('operations_director','运营总监','运营全局与跨角色协调',true),
('sales_director','销售主管','销售团队与 Proposal 审批',true),
('sales_manager','销售经理','广告主、商机与 Proposal 草稿',false),
('media_director','媒体总监','媒体策略与 scale readiness 审批',true),
('media_manager','媒体对接负责人','媒体接入、资料、沟通、询价、采购、排期、合作质量',false),
('adops_manager','投放运营负责人','Campaign 执行与上线检查',false),
('integration_manager','技术接入负责人','SDK/API/VAST/CTV 技术接入',false),
('data_analyst','数据分析师','数据分析与诊断证据',false),
('finance_manager','财务负责人','结算、发票与财务异常',true),
('legal_manager','法务负责人','合同与法务审核',true),
('customer_success_manager','客户成功负责人','客户交付与续约跟进',false),
('product_owner','产品负责人','产品配置与流程优化',false),
('system_admin','系统管理员','用户、系统配置、基础设置',false),
('audit_viewer','审计查看者','只读审计',false)
on conflict (code) do update set name=excluded.name, description=excluded.description, is_business_approval_role=excluded.is_business_approval_role;

insert into public.capability_tags(code, name, description) values
('publisher.manage','管理媒体','创建和维护媒体资料'),
('publisher.readiness.approve','审批媒体可售状态','审批 proposal_selectable / scale_ready'),
('integration.manage','管理技术接入','推进技术接入'),
('advertiser.manage','管理广告主','创建和维护广告主'),
('proposal.manage','管理 Proposal','创建和推进 Proposal'),
('campaign.manage','管理 Campaign','创建和推进 Campaign'),
('diagnostic.manage','管理诊断 Case','创建和处理诊断 Case'),
('settlement.manage','管理结算','处理结算与发票'),
('contract.manage','管理合同','处理合同法务'),
('okr.manage','管理 OKR','创建和维护 OKR'),
('sop.manage','管理 SOP','维护 SOP'),
('audit.read','查看审计','只读查看审计')
on conflict (code) do nothing;

-- Sample publishers with valid locked status values.
insert into public.publishers(name, region, media_type, integration_type, technical_live_status, commercial_test_status, sales_scale_status, risk_level, daily_active_users, daily_requests, metadata) values
('233', 'CN', 'App', 'SDK', 'technical_live_passed', 'test_passed', 'scale_ready', 'low', 3200000, 18000000, '{"uat":"scale ready publisher"}'),
('QuZhi Campus', 'CN', 'App', 'API', 'technical_live_passed', 'testing', 'limited_sellable', 'medium', 1100000, 6000000, '{"uat":"commercial test publisher"}'),
('LOFTER', 'CN', 'App', 'API', 'technical_live_passed', 'test_passed', 'proposal_selectable', 'high', 5000000, 22000000, '{"uat":"proposal selectable with diagnostic risk"}'),
('New CTV Partner', 'CN', 'CTV', 'VAST', 'in_integration', 'not_started', 'not_allowed', 'medium', null, 1000000, '{"uat":"not ready publisher"}')
on conflict do nothing;

insert into public.advertisers(name, industry, region, status, metadata) values
('Daily Yoga', 'Wellness', 'CN', 'active', '{"uat":true}'),
('Game Studio A', 'Gaming', 'CN', 'active', '{"uat":true}'),
('Travel Brand B', 'Travel', 'CN', 'active', '{"uat":true}')
on conflict do nothing;

insert into public.quality_diagnostic_cases(case_no, case_type, title, publisher_id, status, severity, impact_scope, downstream_action, is_blocking_sales_scale, is_blocking_settlement, metadata)
select 'DC-001','clear_rate_low','LOFTER clear rate below expectation', p.id, 'evidence_collection', 'high', 'sales_scale', 'sales_scale_block', true, false, '{"uat":true}'
from public.publishers p where p.name='LOFTER'
on conflict (case_no) do nothing;

insert into public.quality_diagnostic_cases(case_no, case_type, title, publisher_id, status, severity, impact_scope, downstream_action, is_blocking_sales_scale, is_blocking_settlement, metadata)
select 'DC-002','fill_rate_low','QuZhi fill rate review', p.id, 'root_cause_analysis', 'medium', 'commercial_test', 'commercial_test_review', false, false, '{"uat":true}'
from public.publishers p where p.name='QuZhi Campus'
on conflict (case_no) do nothing;

insert into public.sop_cards(title, scenario, role_code, content, related_route) values
('媒体技术上线检查 SOP','technical_go_live','integration_manager','检查 SDK/API/VAST 参数、回调、日志、测试请求、上线证据。','/media/integration-wizard'),
('Proposal 媒体选择 SOP','proposal_media_selection','sales_manager','只能选择通过 Readiness Guard 的媒体，blocked 媒体必须走审批或诊断闭环。','/proposals'),
('Clear Rate 诊断 SOP','clear_rate_low','data_analyst','检查 request-response-bid-win-fill-impression 漏斗并形成证据。','/diagnostics')
on conflict do nothing;
