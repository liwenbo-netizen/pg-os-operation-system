import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { roleDefinitions, type RoleCode } from "../constants/roles";
import type { AppRoute } from "../routes/routes";

export const supportedLocales = ["zh-CN", "en-US"] as const;
export type AppLocale = (typeof supportedLocales)[number];

type TranslationValues = Record<string, string | number>;

const englishText = {
  "shell.operationSystem": "Operation System",
  "shell.activeRole": "Active role",
  "shell.switchRole": "Switch role",
  "shell.language": "Language",
  "shell.guardedRoutes": "Guarded routes",
  "shell.signOut": "Sign out",
  "shell.mockAuth": "Mock auth",
  "shell.supabaseAuth": "Supabase auth",
  "shell.fixtureData": "Fixture data",
  "shell.supabaseLoading": "Supabase loading",
  "shell.supabaseSynced": "Supabase synced",
  "shell.supabaseWarning": "Supabase warning",
  "diagnostics.title": "Supabase diagnostics",
  "diagnostics.close": "Close diagnostics",
  "diagnostics.table": "Table",
  "diagnostics.role": "Role",
  "diagnostics.time": "Time",
  "diagnostics.error": "Error",
  "diagnostics.suggestedFix": "Suggested fix",
  "diagnostics.noWarnings": "No active repository warnings",
  "diagnostics.noWarningsDetail": "The latest repository status has no Supabase warning diagnostics.",
  "login.title": "PG OS business operations workspace",
  "login.description": "Role-aware operating console for publisher readiness, sales guardrails, finance settlement, legal review, SOP, and OKR work.",
  "login.mediaReadiness": "Media readiness",
  "login.proposalGuard": "Proposal guard",
  "login.auditFirst": "Audit first",
  "login.phaseAccess": "Phase 12 access",
  "login.signIn": "Sign in",
  "login.instructions": "Use the local role simulator or bind a Supabase session to PG OS profile roles.",
  "login.mockRole": "Mock role",
  "login.email": "Email",
  "login.password": "Password",
  "login.requestedRole": "Requested active role",
  "login.role": "Role",
  "login.signingIn": "Signing in",
  "login.enterWorkspace": "Enter workspace",
  "login.environment": "Supabase env: {status}",
  "login.configured": "configured",
  "login.notConfigured": "not configured",
  "media.newPublisher": "New publisher",
  "media.mainlineDescription": "Media P0 mainline: publisher profile, ad slots, terms, technical live, commercial test, and sales readiness.",
  "media.ecosystemDescription": "China and APAC media ecosystem expansion: map tracks, screen priority, prove outreach, and convert qualified opportunities into trusted supply candidates.",
  "media.mappedLeads": "Mapped leads",
  "media.activeLeads": "Active leads",
  "media.priority70": "Priority 70+",
  "media.outreachPipeline": "Outreach pipeline",
  "media.gateEligible": "Gate eligible",
  "media.trustedCandidates": "Trusted candidates",
  "media.publishers": "Publishers",
  "media.techLive": "Tech live",
  "media.testPassed": "Test passed",
  "media.salesReady": "Sales ready",
  "media.highRisk": "High risk",
  "media.operationalQueues": "Operational queues",
  "media.activeFilters": "{count} active filter(s)",
  "media.strategicTrackMap": "Strategic track map",
  "media.expansionPipeline": "Expansion pipeline",
  "media.opportunityPool": "Opportunity pool",
  "media.visibleTotal": "{visible} visible / {total} total",
  "media.reset": "Reset",
  "media.searchMedia": "Search media",
  "media.allTracks": "All tracks",
  "media.allStages": "All stages",
  "media.noMatching": "No matching ecosystem opportunities.",
  "media.noLeads": "No ecosystem leads are available.",
  "media.claimOwner": "Claim owner",
  "media.markReviewed": "Mark reviewed",
  "media.priorityScreen": "Priority screen",
  "media.recordContact": "Record contact",
  "media.qualify": "Qualify",
  "media.approveGate": "Approve gate",
  "media.trustedCandidate": "Trusted candidate",
  "media.startReadiness": "Start readiness",
  "media.techReview": "Tech review",
  "media.commercialReview": "Commercial review",
  "media.onboardingProject": "Onboarding project",
  "media.nextAction": "Next action",
  "media.contact": "Contact",
  "media.businessInterest": "Business interest",
  "media.inventory": "Inventory",
  "media.feasibility": "Feasibility",
  "media.confirmed": "confirmed",
  "media.pending": "pending"
} as const;

type TranslationKey = keyof typeof englishText;

const chineseText: Record<TranslationKey, string> = {
  "shell.operationSystem": "业务运营系统",
  "shell.activeRole": "当前角色",
  "shell.switchRole": "切换角色",
  "shell.language": "语言",
  "shell.guardedRoutes": "权限路由",
  "shell.signOut": "退出登录",
  "shell.mockAuth": "模拟登录",
  "shell.supabaseAuth": "Supabase 登录",
  "shell.fixtureData": "示例数据",
  "shell.supabaseLoading": "Supabase 加载中",
  "shell.supabaseSynced": "Supabase 已同步",
  "shell.supabaseWarning": "Supabase 警告",
  "diagnostics.title": "Supabase 诊断",
  "diagnostics.close": "关闭诊断",
  "diagnostics.table": "数据表",
  "diagnostics.role": "角色",
  "diagnostics.time": "时间",
  "diagnostics.error": "错误",
  "diagnostics.suggestedFix": "修复建议",
  "diagnostics.noWarnings": "当前没有仓库警告",
  "diagnostics.noWarningsDetail": "最新仓库状态没有 Supabase 警告诊断。",
  "login.title": "PG OS 业务运营工作台",
  "login.description": "面向媒体准入、销售风控、财务结算、法务审核、SOP 与 OKR 的角色化业务运营系统。",
  "login.mediaReadiness": "媒体准入",
  "login.proposalGuard": "提案风控",
  "login.auditFirst": "审计优先",
  "login.phaseAccess": "系统访问",
  "login.signIn": "登录",
  "login.instructions": "使用本地角色模拟器，或通过 Supabase 会话绑定 PG OS 个人资料与角色。",
  "login.mockRole": "模拟角色",
  "login.email": "邮箱",
  "login.password": "密码",
  "login.requestedRole": "请求使用的角色",
  "login.role": "角色",
  "login.signingIn": "正在登录",
  "login.enterWorkspace": "进入工作台",
  "login.environment": "Supabase 环境：{status}",
  "login.configured": "已配置",
  "login.notConfigured": "未配置",
  "media.newPublisher": "新建媒体",
  "media.mainlineDescription": "媒体 P0 主流程：媒体资料、广告位、商务条款、技术上线、商业测试与销售可用性。",
  "media.ecosystemDescription": "中国及亚太媒体生态拓展：绘制赛道地图、筛选优先级、沉淀外联证据，并将合格机会转入可信供给候选评估。",
  "media.mappedLeads": "已映射线索",
  "media.activeLeads": "活跃线索",
  "media.priority70": "优先级 70+",
  "media.outreachPipeline": "外联流程中",
  "media.gateEligible": "满足准入门槛",
  "media.trustedCandidates": "可信供给候选",
  "media.publishers": "媒体数量",
  "media.techLive": "技术已上线",
  "media.testPassed": "测试已通过",
  "media.salesReady": "销售可用",
  "media.highRisk": "高风险",
  "media.operationalQueues": "运营队列",
  "media.activeFilters": "已启用 {count} 个筛选条件",
  "media.strategicTrackMap": "战略赛道地图",
  "media.expansionPipeline": "拓展流程",
  "media.opportunityPool": "媒体机会池",
  "media.visibleTotal": "显示 {visible} 条 / 共 {total} 条",
  "media.reset": "重置",
  "media.searchMedia": "搜索媒体",
  "media.allTracks": "全部赛道",
  "media.allStages": "全部阶段",
  "media.noMatching": "没有符合当前条件的生态机会。",
  "media.noLeads": "当前没有可用的生态媒体线索。",
  "media.claimOwner": "认领负责人",
  "media.markReviewed": "标记已复核",
  "media.priorityScreen": "优先级筛选",
  "media.recordContact": "记录媒体联系",
  "media.qualify": "完成商务准入",
  "media.approveGate": "批准可信供给准入",
  "media.trustedCandidate": "转为可信供给候选",
  "media.startReadiness": "启动准入准备",
  "media.techReview": "完成技术评估",
  "media.commercialReview": "完成商务评估",
  "media.onboardingProject": "创建准入项目",
  "media.nextAction": "下一步动作",
  "media.contact": "媒体联系人",
  "media.businessInterest": "商务意向",
  "media.inventory": "广告库存",
  "media.feasibility": "接入可行性",
  "media.confirmed": "已确认",
  "media.pending": "待确认"
};

const chineseRoleNames: Record<RoleCode, string> = {
  ceo: "CEO",
  operations_director: "运营总监",
  sales_director: "销售总监",
  sales_manager: "销售经理",
  media_director: "媒体总监",
  media_manager: "媒体经理",
  adops_manager: "广告运营经理",
  integration_manager: "技术集成经理",
  data_analyst: "数据分析师",
  finance_manager: "财务经理",
  legal_manager: "法务经理",
  customer_success_manager: "客户成功经理",
  product_owner: "产品负责人",
  system_admin: "系统管理员",
  audit_viewer: "审计查看员"
};

const chineseRoleScopes: Record<RoleCode, string> = {
  ceo: "全局经营、风险、审批与 OKR 可见性。",
  operations_director: "跨角色协同、项目健康度和运营风险。",
  sales_director: "销售团队、商机与提案审批。",
  sales_manager: "广告主、商机与提案草稿。",
  media_director: "媒体战略、准入审批与规模化决策。",
  media_manager: "媒体准入、联系人、条款、排期和媒体质量。",
  adops_manager: "广告活动执行与上线检查。",
  integration_manager: "SDK、API、VAST 与 CTV 技术集成。",
  data_analyst: "漏斗分析、证据与诊断支持。",
  finance_manager: "结算、发票与财务异常。",
  legal_manager: "合同审核与法务协同。",
  customer_success_manager: "客户交付、续约和上线后跟进。",
  product_owner: "产品配置、SOP 内容与流程调优。",
  system_admin: "仅限用户、配置与系统管理。",
  audit_viewer: "只读审计访问。"
};

const chineseRouteTitles: Record<string, string> = {
  "/ceo/dashboard": "CEO 经营看板",
  "/workbench": "角色工作台",
  "/media/director-command-center": "媒体总监指挥中心",
  "/media/manager-workbench": "媒体经理工作台",
  "/media/china-ecosystem": "中国媒体生态拓展",
  "/media/publishers/:id": "媒体 360",
  "/media/integration-wizard/:id": "技术集成向导",
  "/media/commercial-tests/:id": "商业测试",
  "/diagnostics/:id": "诊断案例",
  "/sales/manager-workbench": "销售经理工作台",
  "/proposals/:id/wizard": "提案工作台",
  "/campaigns/:id/wizard": "活动运营中心",
  "/finance/settlements/:id": "财务结算",
  "/contracts/:id": "合同工作台",
  "/guide": "指南中心",
  "/system/health": "系统健康度",
  "/audit/events": "审计事件",
  "/uat/scripts": "UAT 验收脚本中心",
  "/uat/history": "UAT 验收结果台账",
  "/admin": "系统管理"
};

export function formatText(template: string, values: TranslationValues = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function translate(locale: AppLocale, key: TranslationKey, values?: TranslationValues) {
  const template = locale === "zh-CN" ? chineseText[key] : englishText[key];
  return formatText(template, values);
}

export function getRoleDisplayName(roleCode: RoleCode, locale: AppLocale) {
  return locale === "zh-CN" ? chineseRoleNames[roleCode] : roleDefinitions[roleCode].name;
}

export function getRoleScope(roleCode: RoleCode, locale: AppLocale) {
  return locale === "zh-CN" ? chineseRoleScopes[roleCode] : roleDefinitions[roleCode].scope;
}

export function getRouteDisplayTitle(route: Pick<AppRoute, "path" | "title">, locale: AppLocale) {
  return locale === "zh-CN" ? chineseRouteTitles[route.path] ?? route.title : route.title;
}

export function getInitialLocale(language = typeof navigator === "undefined" ? "" : navigator.language): AppLocale {
  if (typeof window !== "undefined") {
    const savedLocale = window.localStorage.getItem("pgos.locale");
    if (savedLocale === "zh-CN" || savedLocale === "en-US") {
      return savedLocale;
    }
  }

  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en-US",
  setLocale: () => undefined,
  t: (key, values) => translate("en-US", key, values)
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem("pgos.locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values)
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
