import type { RoleCode } from "../constants/roles";
import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  IntegrationAdFormat,
  IntegrationCapabilityProfile,
  IntegrationCheckResult,
  IntegrationCheckStatus,
  IntegrationMode,
  IntegrationPlatform,
  IntegrationPlaybookCode,
  IntegrationPrivacyProfile,
  IntegrationProjectProfile,
  IntegrationProtocol,
  IntegrationTrafficChannel,
  MediaOnboardingStage,
  MediaWorkflowState,
  ModuleBusinessEvent
} from "../types/domain";
import { auditService } from "./auditService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

export type IntegrationPlaybookDefinition = {
  code: IntegrationPlaybookCode;
  name: string;
  nameZh: string;
  vendor: string;
  version: string;
  platform: IntegrationPlatform;
  kind: "origin_ads" | "origin_ivt" | "direct_ads" | "mediation";
  source: string;
};

export type IntegrationChecklistTemplate = {
  code: string;
  stage: Extract<MediaOnboardingStage, "TECHNICAL_QUALIFICATION" | "SDK_INTEGRATION">;
  category: string;
  title: string;
  titleZh: string;
  ownerRole: RoleCode;
  responsibleParty: "MEDIA_ENGINEERING" | "PG_OS";
  required: boolean;
  blocking: boolean;
  appliesTo: "COMMON" | "ADS" | "DIRECT_ADS" | "MEDIATION" | "BIDDING" | "ORIGIN_ADS" | "ORIGIN_IVT";
  channels?: IntegrationTrafficChannel[];
  modes?: IntegrationMode[];
  protocols?: IntegrationProtocol[];
};

export type IntegrationWorkflowPhaseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type IntegrationWorkflowPhaseDefinition = {
  index: IntegrationWorkflowPhaseIndex;
  code:
    | "MEDIA_AUTHORIZATION"
    | "COMMERCIAL_FEASIBILITY"
    | "AD_PRODUCT_FIT"
    | "INTEGRATION_ROUTE"
    | "COMMERCIAL_SETTLEMENT"
    | "SUPPLY_ACCEPTANCE"
    | "PRIVACY_REGULATORY"
    | "ARCHITECTURE_BOUNDARY"
    | "TECHNICAL_ENVIRONMENT"
    | "INTEGRATION_VALIDATION"
    | "PRODUCTION_CERTIFICATION"
    | "PILOT_VALIDATION"
    | "SCALE_GOVERNANCE";
  dependsOn: IntegrationWorkflowPhaseIndex[];
  ownerRole: RoleCode;
  collaboratorRoles: RoleCode[];
  targetOffsetDaysFromPilot: number;
  name: string;
  nameZh: string;
  output: string;
  outputZh: string;
};

export type IntegrationGateExecutionContract = {
  requiredInputs: string[];
  requiredInputsZh: string[];
  deliverables: string[];
  deliverablesZh: string[];
  passConditions: string[];
  passConditionsZh: string[];
  blockingConditions: string[];
  blockingConditionsZh: string[];
};

export type EngineeringEntryStatus = "blocked" | "conditional" | "ready";

export type EngineeringHandoffIssue = {
  code:
    | "publisher_identity"
    | "primary_contact"
    | "active_inventory"
    | "commercial_terms"
    | "technical_profile"
    | "engineering_contact"
    | "property_identifier"
    | "pilot_date"
    | "handoff_acceptance";
  label: string;
  labelZh: string;
  ownerRole: RoleCode;
  blocking: boolean;
};

export type IntegrationCheckGuidance = {
  requiredInput: string;
  requiredInputZh: string;
  evidenceExpectation: string;
  evidenceExpectationZh: string;
  passCriteria: string;
  passCriteriaZh: string;
};

export type IntegrationProjectProfileInput = {
  platform: IntegrationPlatform;
  trafficChannel: IntegrationTrafficChannel;
  integrationMode: IntegrationMode;
  protocolCodes: IntegrationProtocol[];
  capabilityProfile: IntegrationCapabilityProfile;
  propertyIdentifier: string;
  playbookCodes: IntegrationPlaybookCode[];
  minSdk?: number;
  targetSdk?: number;
  compileSdk?: number;
  agpVersion?: string;
  gradleVersion?: string;
  language?: IntegrationProjectProfile["language"];
  processModel?: IntegrationProjectProfile["process_model"];
  mediaEngineeringContact: string;
  plannedFormats: IntegrationAdFormat[];
  privacyProfile: IntegrationPrivacyProfile;
  targetPilotDate?: string;
  secretReference?: string;
};

export type IntegrationRouteDefinition<T extends string> = {
  code: T;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
};

export type IntegrationCheckUpdateInput = {
  itemCode: string;
  status: IntegrationCheckStatus;
  evidenceReference?: string;
  blocker?: string;
  waiverReason?: string;
  dueDate?: string;
};

export type SdkIntegrationResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

export const integrationPlaybooks: IntegrationPlaybookDefinition[] = [
  {
    code: "origin_ads_android_1_2",
    name: "Origin Ads Android",
    nameZh: "Origin Ads 安卓",
    vendor: "Poly-Gamma",
    version: "1.2.0-development",
    platform: "android",
    kind: "origin_ads",
    source: "Origin Android SDK index.pdf"
  },
  {
    code: "origin_ivt_android_v11",
    name: "Origin IVT Android",
    nameZh: "Origin IVT 安卓",
    vendor: "Poly-Gamma",
    version: "V11",
    platform: "android",
    kind: "origin_ivt",
    source: "Origin IVT SDK Developer Portal V11"
  },
  {
    code: "fangge_android_reference",
    name: "Fangge Android reference",
    nameZh: "方歌安卓参考",
    vendor: "Fangge",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "Fangge Android SDK guide"
  },
  {
    code: "sigmob_android_reference",
    name: "Sigmob Android reference",
    nameZh: "Sigmob 安卓参考",
    vendor: "Sigmob",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "Sigmob Android SDK guide"
  },
  {
    code: "tobid_android_reference",
    name: "ToBid Android mediation reference",
    nameZh: "ToBid 安卓聚合参考",
    vendor: "ToBid",
    version: "source-controlled",
    platform: "android",
    kind: "mediation",
    source: "ToBid Android SDK guide"
  },
  {
    code: "beizi_android_reference",
    name: "BeiZi Android reference",
    nameZh: "倍孜安卓参考",
    vendor: "BeiZi",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "BeiZi Android SDK guide"
  }
];

export const integrationChannels: IntegrationRouteDefinition<IntegrationTrafficChannel>[] = [
  {
    code: "mobile",
    name: "Mobile",
    nameZh: "移动端",
    description: "Android, iOS, tablet, and system applications.",
    descriptionZh: "Android、iOS、平板和系统应用流量。"
  },
  {
    code: "ctv",
    name: "CTV / OTT",
    nameZh: "CTV / OTT",
    description: "TV apps, FAST channels, OEM inventory, and connected TV devices.",
    descriptionZh: "电视 App、FAST 频道、OEM 系统资源和联网电视设备。"
  },
  {
    code: "dooh",
    name: "DOOH",
    nameZh: "数字户外",
    description: "Networked displays, proof-of-play inventory, and venue screens.",
    descriptionZh: "联网屏幕、点位清单、播放证明和场所媒体。"
  },
  {
    code: "pc",
    name: "PC",
    nameZh: "PC / 桌面端",
    description: "Web, Windows, macOS, desktop clients, and PC games.",
    descriptionZh: "网页、Windows、macOS、桌面客户端和 PC 游戏。"
  },
  {
    code: "connected_device",
    name: "Connected device",
    nameZh: "联网智能设备",
    description: "In-vehicle, smart-home, audio, wearable, and embedded devices.",
    descriptionZh: "车载、智能家居、音频、穿戴和嵌入式联网设备。"
  }
];

export const integrationModes: IntegrationRouteDefinition<IntegrationMode>[] = [
  {
    code: "ivt_sdk_api",
    name: "IVT SDK + API",
    nameZh: "IVT SDK + API",
    description: "The media retains ad decisioning, rendering, and lifecycle ownership.",
    descriptionZh: "媒体保留广告请求、渲染和生命周期控制，PG 提供需求、API 与 IVT。"
  },
  {
    code: "full_sdk",
    name: "Poly-Gamma full SDK",
    nameZh: "Poly-Gamma 全套 SDK",
    description: "Poly-Gamma owns the ad request, rendering, callbacks, and IVT lifecycle.",
    descriptionZh: "PG SDK 负责广告请求、素材、渲染、回调和 IVT 生命周期。"
  },
  {
    code: "lightweight_sdk_api",
    name: "Lightweight SDK + API",
    nameZh: "轻量 SDK + API",
    description: "A channel-specific lightweight client pairs with server or device APIs.",
    descriptionZh: "渠道专用轻量客户端配合服务端或设备 API，适用于 DOOH、PC 和联网设备。"
  },
  {
    code: "player_component",
    name: "Player component",
    nameZh: "播放器组件 / CTV 全套 SDK",
    description: "Poly-Gamma controls the advertising playback layer for qualified CTV cases.",
    descriptionZh: "PG 控制广告播放层，仅用于缺少成熟播放器的合格 CTV 项目。"
  }
];

export const integrationProtocols: IntegrationRouteDefinition<IntegrationProtocol>[] = [
  { code: "api", name: "API", nameZh: "API", description: "Direct advertising API.", descriptionZh: "广告请求与事件 API。" },
  { code: "openrtb", name: "OpenRTB", nameZh: "OpenRTB", description: "OpenRTB or compatible exchange protocol.", descriptionZh: "OpenRTB 或兼容协议。" },
  { code: "vast", name: "VAST", nameZh: "VAST", description: "Video ad serving template.", descriptionZh: "视频广告交付与 Tracking 协议。" },
  { code: "private_protocol", name: "Private protocol", nameZh: "私有协议", description: "A jointly governed private protocol.", descriptionZh: "双方共同管理的私有协议。" },
  { code: "javascript_sdk", name: "JavaScript SDK", nameZh: "JavaScript SDK", description: "Browser or WebView integration.", descriptionZh: "浏览器或 WebView 接入。" },
  { code: "native_sdk", name: "Native SDK", nameZh: "原生 SDK", description: "Native application SDK integration.", descriptionZh: "原生应用 SDK 接入。" },
  { code: "device_protocol", name: "Device protocol", nameZh: "设备协议", description: "Device or OEM-specific protocol.", descriptionZh: "设备或 OEM 专用协议。" }
];

export const integrationGateExecutionContracts: Record<
  IntegrationWorkflowPhaseIndex,
  IntegrationGateExecutionContract
> = {
  0: {
    requiredInputs: [
      "Contracting entity, operating entity, payment entity, and evidence of their relationship.",
      "Real app bundle, domain, channel, screen, device, or other inventory identifiers.",
      "Monetization authorization and control of requests, display, and frequency.",
      "OEM, copyright owner, distributor, parent-platform, and reseller relationships."
    ],
    requiredInputsZh: [
      "签约主体、实际运营主体、收款主体及三者关系证明。",
      "真实 App Bundle、域名、频道、屏幕、设备或其他库存标识。",
      "广告商业化授权，以及广告请求、展示和频控控制权。",
      "OEM、版权方、发行方、上级平台及转售关系披露。"
    ],
    deliverables: [
      "Media entity and monetization authorization assessment.",
      "Inventory-control and direct-or-resold supply-path matrix."
    ],
    deliverablesZh: [
      "《媒体主体与商业化授权核验记录》。",
      "《库存控制权与直接/转售供应路径矩阵》。"
    ],
    passConditions: [
      "Entity relationships and monetization rights are traceable.",
      "Inventory identifiers are real and the media controls ad display.",
      "Every resale layer and upstream authorization is disclosed."
    ],
    passConditionsZh: [
      "主体关系与商业化授权均有可追溯证据。",
      "库存标识真实，且媒体能够控制广告展示。",
      "所有转售层级与上游授权已经完整披露。"
    ],
    blockingConditions: [
      "Ownership or monetization authorization cannot be proven.",
      "The entity relationship, property identifier, display control, or resale path is unclear."
    ],
    blockingConditionsZh: [
      "无法证明流量所有权或商业化授权。",
      "主体关系、媒体标识、展示控制权或转售路径不清。"
    ]
  },
  1: {
    requiredInputs: [
      "DAU, MAU, requests, impressions, geography, language, platform, and usage frequency.",
      "Placement visibility, fill rate, CPM, revenue, IVT, fraud, and complaint history.",
      "Demand-market fit, integration effort, expected revenue, and minimum commercial scale."
    ],
    requiredInputsZh: [
      "DAU、MAU、请求、曝光、地区、语言、终端和使用频率。",
      "广告位可视性、填充率、CPM、收入、IVT、作弊与投诉历史。",
      "需求市场匹配、预计接入成本、预计收入与最低商业规模。"
    ],
    deliverables: [
      "Media assessment with source-dated traffic evidence.",
      "Revenue estimate, ROI, priority, and go/no-go recommendation."
    ],
    deliverablesZh: [
      "附数据来源与统计周期的《媒体流量与质量评估》。",
      "收入测算、ROI、接入优先级及 Go/No-Go 结论。"
    ],
    passConditions: [
      "Traffic evidence is credible and addressable demand exists.",
      "Expected value meets the minimum commercial threshold.",
      "Quality and IVT risk are within an accepted range."
    ],
    passConditionsZh: [
      "流量证据可信，且存在可采购的有效需求。",
      "预期收益达到最低商业门槛。",
      "流量质量与 IVT 风险处于可接受范围。"
    ],
    blockingConditions: [
      "No reliable traffic evidence or no addressable buyer demand.",
      "Negative ROI, unacceptable IVT risk, or scale below the minimum threshold."
    ],
    blockingConditionsZh: [
      "无法提供可信流量证据，或目标地区没有有效需求。",
      "ROI 为负、IVT 风险不可接受或规模低于最低门槛。"
    ]
  },
  2: {
    requiredInputs: [
      "Placement, page or playback scene, request and display trigger, container, and visibility.",
      "Creative format, size, cache, frequency, close behavior, deep-link behavior, and review rules.",
      "Forecast requests, impressions, peak QPS, platform lifecycle, and channel-specific playback capability."
    ],
    requiredInputsZh: [
      "广告位、页面/播放场景、请求与展示触发、容器和可视性。",
      "素材形式与尺寸、缓存、频控、关闭、跳转及素材审核规则。",
      "请求/曝光预估、峰值 QPS、平台生命周期及渠道专属播放能力。"
    ],
    deliverables: [
      "Placement inventory and lifecycle specification.",
      "Product-fit decision for every planned advertising scene."
    ],
    deliverablesZh: [
      "《广告位库存与生命周期规格表》。",
      "逐广告场景的产品适配结论。"
    ],
    passConditions: [
      "Every planned placement has a standard measurable ad lifecycle.",
      "Visibility, event ownership, format, frequency, and forecast are confirmed."
    ],
    passConditionsZh: [
      "每个计划广告位均具备标准、可测量的广告生命周期。",
      "可视性、事件归属、形式、频控和流量预估均已确认。"
    ],
    blockingConditions: [
      "The media cannot distinguish load from real impression or cannot control visibility.",
      "The placement, player, format, or store policy cannot support the intended advertising scene."
    ],
    blockingConditionsZh: [
      "媒体无法区分加载与真实曝光，或无法控制容器可视性。",
      "广告位、播放器、素材形式或应用商店政策不支持目标场景。"
    ]
  },
  3: {
    requiredInputs: [
      "Existing ad server, player, SDK, API, VAST, lifecycle-event, and rendering capabilities.",
      "Required channel, integration depth, delivery protocol, and responsibility preference.",
      "Request-ID and IVT-event correlation capability."
    ],
    requiredInputsZh: [
      "现有 Ad Server、播放器、SDK、API、VAST、生命周期事件与渲染能力。",
      "目标渠道、接入深度、交付协议及双方责任偏好。",
      "Request ID 与 IVT 事件关联能力。"
    ],
    deliverables: [
      "Approved integration route decision.",
      "Capability-gap and responsibility summary."
    ],
    deliverablesZh: [
      "批准的《接入模式与渠道方案决策》。",
      "能力缺口与双方责任摘要。"
    ],
    passConditions: [
      "The selected route matches the media's actual capabilities.",
      "Protocol, rendering, lifecycle, and IVT responsibilities are accepted by both parties."
    ],
    passConditionsZh: [
      "所选接入路径与媒体真实能力相匹配。",
      "协议、渲染、生命周期与 IVT 责任已由双方确认。"
    ],
    blockingConditions: [
      "The selected route depends on capabilities the media does not have.",
      "Critical rendering, lifecycle, or IVT ownership remains unassigned."
    ],
    blockingConditionsZh: [
      "所选路径依赖媒体并不具备的关键能力。",
      "渲染、生命周期或 IVT 关键责任仍无人承担。"
    ]
  },
  4: {
    requiredInputs: [
      "Buying model, pricing, revenue share, currency, tax, and demand source.",
      "Billable event, IVT deduction, reconciliation source, tolerance, invoice, and payment cycle.",
      "Traffic, technology, complaint, refund, and invalid-traffic liabilities."
    ],
    requiredInputsZh: [
      "采购模式、价格、分成、币种、税费及需求来源。",
      "计费事件、IVT 扣减、对账依据、差异容忍、开票及付款周期。",
      "流量、技术、投诉、退款与无效流量责任。"
    ],
    deliverables: [
      "Approved commercial and settlement term sheet.",
      "Reconciliation priority and liability matrix."
    ],
    deliverablesZh: [
      "批准的《商业与结算条款表》。",
      "对账依据优先级与责任矩阵。"
    ],
    passConditions: [
      "Commercial owners, finance, and legal have approved the terms.",
      "Revenue, reconciliation, payment, and liability definitions are unambiguous."
    ],
    passConditionsZh: [
      "商务、财务与法务责任人均已批准。",
      "收入、对账、付款与责任定义无歧义。"
    ],
    blockingConditions: [
      "Pricing or settlement basis is unresolved.",
      "IVT, refund, data-difference, or technical-liability allocation is disputed."
    ],
    blockingConditionsZh: [
      "价格或结算依据尚未确定。",
      "IVT、退款、数据差异或技术责任仍有争议。"
    ]
  },
  5: {
    requiredInputs: [
      "Bundle or domain, store URL, publisher and seller IDs, and WebView domain.",
      "app-ads.txt or ads.txt, sellers.json, schain, DIRECT or RESELLER, and MANAGERDOMAIN.",
      "Intermediate ad-server or SSP relationships, DSP recognition, and historical supply risk."
    ],
    requiredInputsZh: [
      "Bundle/域名、商店链接、Publisher/Seller ID 与 WebView 域名。",
      "app-ads.txt/ads.txt、sellers.json、schain、DIRECT/RESELLER 与 MANAGERDOMAIN。",
      "中间 Ad Server/SSP 关系、DSP 识别结果及历史供应风险。"
    ],
    deliverables: [
      "Supply-chain declaration and validation report.",
      "Buyer or DSP acceptance result."
    ],
    deliverablesZh: [
      "《供应链身份声明与校验报告》。",
      "主要需求方或 DSP 可接受性结论。"
    ],
    passConditions: [
      "Public declarations and seller identities are consistent.",
      "The supply path is recognized by target demand partners."
    ],
    passConditionsZh: [
      "公开声明与 Seller 身份保持一致。",
      "目标需求方能够正确识别该供应路径。"
    ],
    blockingConditions: [
      "Bundle, seller identity, public declarations, or schain are invalid or inconsistent.",
      "Target DSPs reject or cannot identify the supply."
    ],
    blockingConditionsZh: [
      "Bundle、Seller 身份、公开声明或 schain 无效或不一致。",
      "目标 DSP 拒绝或无法识别该供应。"
    ]
  },
  6: {
    requiredInputs: [
      "Consent timing, initialization behavior, withdrawal, and non-consented behavior.",
      "Identifier and field whitelist by Mobile or CTV, purpose, retention, and deletion.",
      "Minor traffic, GDPR, TCF, GPP, CCPA, PIPL, cross-border, and masking requirements."
    ],
    requiredInputsZh: [
      "授权时机、初始化行为、撤回授权与未授权状态处理。",
      "按 Mobile/CTV 区分的标识符与字段白名单、用途、保留及删除方式。",
      "未成年人、GDPR、TCF、GPP、CCPA、PIPL、跨境与日志脱敏要求。"
    ],
    deliverables: [
      "Approved privacy and data-boundary assessment.",
      "Field whitelist, consent flow, and compliance responsibility matrix."
    ],
    deliverablesZh: [
      "批准的《隐私与数据边界评估》。",
      "字段白名单、授权流程与合规责任矩阵。"
    ],
    passConditions: [
      "Consent, collection, purpose, retention, transfer, and deletion are approved.",
      "Channel-specific data fields and responsibilities are documented."
    ],
    passConditionsZh: [
      "授权、采集、用途、保留、传输与删除均已批准。",
      "渠道专属数据字段与双方责任已记录。"
    ],
    blockingConditions: [
      "Sensitive data is collected before consent or without an approved purpose.",
      "Cross-border, minor, retention, or regulatory responsibility remains unresolved."
    ],
    blockingConditionsZh: [
      "未授权即采集敏感数据，或采集用途未经批准。",
      "跨境、未成年人、保留周期或监管责任尚未解决。"
    ]
  },
  7: {
    requiredInputs: [
      "Request, response, creative, impression, click, IVT, consent, error, retry, report, and settlement flows.",
      "System components, third parties, identifiers, timestamps, and data ownership.",
      "Responsibility for consent, decisioning, rendering, tracking, frequency, review, and incident handling."
    ],
    requiredInputsZh: [
      "请求、响应、素材、曝光、点击、IVT、授权、错误、重试、报表与结算链路。",
      "系统组件、第三方、关键标识、时间戳与数据归属。",
      "授权、决策、渲染、上报、频控、审核与故障处理责任。"
    ],
    deliverables: [
      "End-to-end architecture and data-flow diagram.",
      "RACI and failure-handling matrix."
    ],
    deliverablesZh: [
      "端到端架构与数据流图。",
      "RACI 责任矩阵与故障处理矩阵。"
    ],
    passConditions: [
      "Every event and data flow has an owner, identifier, and failure path.",
      "Media, Poly-Gamma, and third-party boundaries are jointly approved."
    ],
    passConditionsZh: [
      "每条事件与数据链路均有负责人、关联标识和失败处理路径。",
      "媒体、Poly-Gamma 与第三方责任边界已共同批准。"
    ],
    blockingConditions: [
      "A critical request, rendering, event, IVT, or settlement path is undefined.",
      "Responsibility for exposure, tracking, or failure recovery is disputed."
    ],
    blockingConditionsZh: [
      "关键请求、渲染、事件、IVT 或结算链路未定义。",
      "曝光、上报或故障恢复责任仍有争议。"
    ]
  },
  8: {
    requiredInputs: [
      "SDK, API, OpenRTB or VAST versions, fields, macros, errors, timeout, and retry.",
      "Lifecycle events, identifiers, network, CDN, TLS, allowlist, proxy, and certificate requirements.",
      "Package, CPU, memory, crash, ANR, process, storage, log, encryption, and test-environment limits."
    ],
    requiredInputsZh: [
      "SDK/API/OpenRTB/VAST 版本、字段、宏、错误码、超时与重试。",
      "生命周期事件、标识符、网络、CDN、TLS、白名单、代理与证书要求。",
      "包体、CPU、内存、Crash、ANR、进程、存储、日志、加密与测试环境限制。"
    ],
    deliverables: [
      "Versioned technical specification package.",
      "Ready test environment, credentials, endpoints, devices, creatives, and log method."
    ],
    deliverablesZh: [
      "带版本的《技术规格包》。",
      "可用的测试环境、凭证、Endpoint、设备、素材与日志/抓包方式。"
    ],
    passConditions: [
      "All protocol, event, data, network, security, and performance inputs are locked.",
      "Both teams can build, test, diagnose, and reproduce results."
    ],
    passConditionsZh: [
      "协议、事件、数据、网络、安全与性能输入均已锁定。",
      "双方团队均可构建、测试、诊断并复现结果。"
    ],
    blockingConditions: [
      "Required specifications, credentials, endpoints, devices, or logs are unavailable.",
      "Security, compatibility, network, or performance constraints are unresolved."
    ],
    blockingConditionsZh: [
      "必要规格、凭证、Endpoint、设备或日志能力缺失。",
      "安全、兼容、网络或性能限制尚未解决。"
    ]
  },
  9: {
    requiredInputs: [
      "Integrated build, test plan, environments, test traffic, creatives, and trace identifiers.",
      "Functional, data-reconciliation, and commercial-validation scenarios.",
      "DSP recognition, budget, price, deal, review, settlement, and restriction cases."
    ],
    requiredInputsZh: [
      "集成包、测试计划、环境、测试流量、素材与链路追踪标识。",
      "功能联调、数据联调与商业化联调场景。",
      "DSP 识别、预算、价格、Deal、审核、结算与限制测试用例。"
    ],
    deliverables: [
      "Integrated build and defect register.",
      "Functional, data, and commercial-validation reports."
    ],
    deliverablesZh: [
      "可测试集成包与缺陷清单。",
      "功能、数据与商业化三类联调报告。"
    ],
    passConditions: [
      "Ad lifecycle works and request, impression, click, video, and IVT IDs reconcile.",
      "Production demand can bid, render, price, restrict, and generate settlement data."
    ],
    passConditionsZh: [
      "广告生命周期正常，请求、曝光、点击、视频与 IVT 标识可对账。",
      "生产需求能够出价、展示、执行价格与限制并生成结算数据。"
    ],
    blockingConditions: [
      "Functional or data traces are incomplete, duplicated, or irreconcilable.",
      "Demand cannot recognize, bid, render, price, or settle the inventory."
    ],
    blockingConditionsZh: [
      "功能或数据链路缺失、重复或无法对账。",
      "需求方无法识别、出价、展示、定价或结算该库存。"
    ]
  },
  10: {
    requiredInputs: [
      "Technical KPIs, crash and ANR, event integrity, playback, latency, and weak-network results.",
      "Privacy, supply-chain, and commercial certification evidence.",
      "Joint sign-off owners and production launch plan."
    ],
    requiredInputsZh: [
      "技术 KPI、Crash/ANR、事件完整性、播放、时延与弱网结果。",
      "隐私、供应链与商业认证证据。",
      "联合签字责任人与生产上线方案。"
    ],
    deliverables: [
      "Joint technical, privacy, supply-chain, and commercial certification report.",
      "Approved production-launch decision."
    ],
    deliverablesZh: [
      "技术、隐私、供应链与商业四类联合认证报告。",
      "批准的生产上线决策。"
    ],
    passConditions: [
      "All four certifications pass with traceable evidence.",
      "Media, technical, legal, finance, and operations approvers sign off."
    ],
    passConditionsZh: [
      "四类认证均以可追溯证据通过。",
      "媒体、技术、法务、财务与运营批准人完成联合签字。"
    ],
    blockingConditions: [
      "Any certification fails or a launch-critical risk remains open.",
      "Required joint approval is missing."
    ],
    blockingConditionsZh: [
      "任一认证失败，或仍存在影响上线的关键风险。",
      "必要的联合批准尚未完成。"
    ]
  },
  11: {
    requiredInputs: [
      "Pilot traffic percentage, duration, countries, placements, budget, price, and rollback threshold.",
      "Auction, delivery, quality, performance, revenue, complaint, and reconciliation KPI baselines.",
      "Monitoring owner, escalation path, and daily review cadence."
    ],
    requiredInputsZh: [
      "灰度流量比例、周期、国家、广告位、预算、价格与回滚阈值。",
      "竞价、交付、质量、性能、收入、投诉与对账 KPI 基线。",
      "监控负责人、升级路径与每日复盘节奏。"
    ],
    deliverables: [
      "Controlled pilot report with KPI evidence and incident history.",
      "Scale, hold, rollback, or remediation decision."
    ],
    deliverablesZh: [
      "附 KPI 证据与事件记录的《小流量灰度报告》。",
      "扩量、保持、回滚或整改决策。"
    ],
    passConditions: [
      "Technical, auction, display, quality, revenue, and reconciliation KPIs meet thresholds.",
      "No unresolved crash, IVT, rendering, supply, complaint, or data-difference risk remains."
    ],
    passConditionsZh: [
      "技术、竞价、展示、质量、收入与对账 KPI 达标。",
      "不存在未解决的 Crash、IVT、渲染、供应链、投诉或数据差异风险。"
    ],
    blockingConditions: [
      "Bid or win volume does not convert to valid impressions or revenue.",
      "IVT, crashes, playback failures, complaints, or reconciliation differences exceed thresholds."
    ],
    blockingConditionsZh: [
      "Bid/Win 无法转化为有效曝光或收入。",
      "IVT、Crash、播放失败、投诉或对账差异超过阈值。"
    ]
  },
  12: {
    requiredInputs: [
      "Scale plan, demand and budget plan, floor, geography, placement, and frequency strategy.",
      "Supply declaration, SDK or API version, compatibility, certificate, and app-release maintenance plan.",
      "Quality, IVT, complaint, reconciliation, incident, and commercial-review cadence."
    ],
    requiredInputsZh: [
      "扩量方案、需求与预算计划、Floor、地区、广告位与频控策略。",
      "供应链声明、SDK/API 版本、兼容、证书与媒体发版维护计划。",
      "质量、IVT、投诉、对账、事故与商业复盘节奏。"
    ],
    deliverables: [
      "Operating handover and scale-governance plan.",
      "Recurring KPI dashboard, owner calendar, and review mechanism."
    ],
    deliverablesZh: [
      "《规模化运营交接与持续治理方案》。",
      "周期 KPI 看板、负责人日历与复盘机制。"
    ],
    passConditions: [
      "Operational owners, KPIs, alerts, maintenance, and review cadence are active.",
      "Supply remains compliant, purchasable, stable, measurable, and reconcilable."
    ],
    passConditionsZh: [
      "运营负责人、KPI、告警、维护与复盘机制已经运行。",
      "供应持续保持合规、可采购、稳定、可测量且可对账。"
    ],
    blockingConditions: [
      "No accountable operating owner or recurring monitoring exists.",
      "Supply identity, quality, compatibility, revenue, or reconciliation degrades below threshold."
    ],
    blockingConditionsZh: [
      "缺少明确运营负责人或周期监控机制。",
      "供应链身份、质量、兼容、收入或对账低于门槛。"
    ]
  }
};

export function getIntegrationGateExecutionContract(
  phaseIndex: IntegrationWorkflowPhaseIndex
) {
  return integrationGateExecutionContracts[phaseIndex];
}

export const integrationWorkflowPhases: IntegrationWorkflowPhaseDefinition[] = [
  {
    index: 0,
    code: "MEDIA_AUTHORIZATION",
    dependsOn: [],
    ownerRole: "media_manager",
    collaboratorRoles: ["legal_manager", "integration_manager"],
    targetOffsetDaysFromPilot: -70,
    name: "Media authorization and inventory control",
    nameZh: "媒体主体、授权及库存控制权",
    output: "Verified legal entity, traffic ownership, monetization rights, inventory control, and resale disclosure.",
    outputZh: "确认签约主体、流量所有权、商业化授权、库存控制权和转售关系。"
  },
  {
    index: 1,
    code: "COMMERCIAL_FEASIBILITY",
    dependsOn: [0],
    ownerRole: "sales_manager",
    collaboratorRoles: ["media_manager", "adops_manager", "data_analyst"],
    targetOffsetDaysFromPilot: -63,
    name: "Traffic quality and commercial feasibility",
    nameZh: "流量质量及商业可行性",
    output: "Demand fit, traffic quality, revenue estimate, integration cost, ROI, and priority decision.",
    outputZh: "形成需求匹配、流量质量、收入测算、接入成本、ROI 和优先级结论。"
  },
  {
    index: 2,
    code: "AD_PRODUCT_FIT",
    dependsOn: [1],
    ownerRole: "media_manager",
    collaboratorRoles: ["sales_manager", "adops_manager", "integration_manager"],
    targetOffsetDaysFromPilot: -56,
    name: "Advertising scenario and product fit",
    nameZh: "广告场景及产品适配",
    output: "Documented placements, triggers, visibility, formats, controls, forecast, and platform fit.",
    outputZh: "确认广告位、触发、可视性、素材、频控、流量预估和产品适配。"
  },
  {
    index: 3,
    code: "INTEGRATION_ROUTE",
    dependsOn: [2],
    ownerRole: "integration_manager",
    collaboratorRoles: ["media_manager", "adops_manager", "product_owner"],
    targetOffsetDaysFromPilot: -49,
    name: "Integration route and channel solution",
    nameZh: "接入模式及渠道方案选择",
    output: "Approved channel, SDK/API depth, protocols, capability fit, and delivery route.",
    outputZh: "批准渠道、SDK/API 接入深度、协议、能力匹配和交付路径。"
  },
  {
    index: 4,
    code: "COMMERCIAL_SETTLEMENT",
    dependsOn: [3],
    ownerRole: "sales_manager",
    collaboratorRoles: ["finance_manager", "legal_manager", "media_manager"],
    targetOffsetDaysFromPilot: -35,
    name: "Commercial model and settlement",
    nameZh: "商业模式、结算及流量责任",
    output: "Approved buying model, pricing, revenue share, reconciliation source, payment, and liability terms.",
    outputZh: "确认采购模式、价格、分成、对账依据、付款周期和流量责任。"
  },
  {
    index: 5,
    code: "SUPPLY_ACCEPTANCE",
    dependsOn: [3],
    ownerRole: "adops_manager",
    collaboratorRoles: ["media_manager", "sales_manager", "data_analyst"],
    targetOffsetDaysFromPilot: -35,
    name: "Supply identity and buyer acceptance",
    nameZh: "供应链身份及需求方可接受性",
    output: "Verified bundle, publisher and seller identities, ads declarations, schain, and DSP recognition.",
    outputZh: "核验 Bundle、Publisher/Seller ID、ads 声明、schain 和 DSP 可识别性。"
  },
  {
    index: 6,
    code: "PRIVACY_REGULATORY",
    dependsOn: [3],
    ownerRole: "legal_manager",
    collaboratorRoles: ["integration_manager", "data_analyst", "product_owner"],
    targetOffsetDaysFromPilot: -35,
    name: "Privacy, data, and regulatory boundary",
    nameZh: "隐私、数据及监管边界",
    output: "Approved consent, identifier whitelist, retention, cross-border, regulatory, and compliance responsibilities.",
    outputZh: "批准授权、字段白名单、保留周期、跨境、监管和合规责任。"
  },
  {
    index: 7,
    code: "ARCHITECTURE_BOUNDARY",
    dependsOn: [3],
    ownerRole: "integration_manager",
    collaboratorRoles: ["media_manager", "data_analyst", "adops_manager"],
    targetOffsetDaysFromPilot: -35,
    name: "Architecture, data flow, and responsibility",
    nameZh: "技术架构、数据流及责任边界",
    output: "Approved request, response, creative, event, IVT, consent, reporting, and settlement data flows.",
    outputZh: "确认请求、响应、素材、事件、IVT、授权、报表和结算数据链路及责任矩阵。"
  },
  {
    index: 8,
    code: "TECHNICAL_ENVIRONMENT",
    dependsOn: [4, 5, 6, 7],
    ownerRole: "integration_manager",
    collaboratorRoles: ["media_manager", "data_analyst", "adops_manager"],
    targetOffsetDaysFromPilot: -28,
    name: "Technical specification and environment",
    nameZh: "技术规格及环境准备",
    output: "Locked protocol, event, data, network, security, performance, and test-environment inputs.",
    outputZh: "锁定协议、事件、数据、网络、安全、性能和测试环境输入。"
  },
  {
    index: 9,
    code: "INTEGRATION_VALIDATION",
    dependsOn: [8],
    ownerRole: "integration_manager",
    collaboratorRoles: ["media_manager", "data_analyst", "adops_manager", "finance_manager"],
    targetOffsetDaysFromPilot: -14,
    name: "Development and three-way validation",
    nameZh: "开发、功能/数据/商业化联调",
    output: "Integrated build plus functional, data-reconciliation, DSP, budget, pricing, and settlement validation.",
    outputZh: "完成集成包及功能、数据对账、DSP、预算、价格和结算三类联调。"
  },
  {
    index: 10,
    code: "PRODUCTION_CERTIFICATION",
    dependsOn: [9],
    ownerRole: "media_director",
    collaboratorRoles: ["integration_manager", "legal_manager", "adops_manager", "finance_manager", "operations_director"],
    targetOffsetDaysFromPilot: -7,
    name: "Production certification and launch gate",
    nameZh: "生产认证及上线门禁",
    output: "Joint technical, privacy, supply-chain, and commercial certification with launch approval.",
    outputZh: "完成技术、隐私、供应链和商业四类认证及联合上线批准。"
  },
  {
    index: 11,
    code: "PILOT_VALIDATION",
    dependsOn: [10],
    ownerRole: "adops_manager",
    collaboratorRoles: ["integration_manager", "media_manager", "data_analyst", "finance_manager", "sales_manager"],
    targetOffsetDaysFromPilot: 0,
    name: "Controlled production pilot",
    nameZh: "小流量灰度及商业验证",
    output: "Controlled traffic ramp with technical, auction, quality, revenue, and reconciliation KPI evidence.",
    outputZh: "完成受控流量放量及技术、竞价、质量、收入和对账 KPI 验证。"
  },
  {
    index: 12,
    code: "SCALE_GOVERNANCE",
    dependsOn: [11],
    ownerRole: "operations_director",
    collaboratorRoles: ["media_director", "adops_manager", "sales_manager", "finance_manager", "customer_success_manager"],
    targetOffsetDaysFromPilot: 21,
    name: "Scale operation and governance",
    nameZh: "规模化运营及持续治理",
    output: "Scale decision, operating handover, version governance, supply maintenance, and recurring business review.",
    outputZh: "完成放量决策、运营交接、版本治理、供应链维护和周期商业复盘。"
  }
];

const businessDecisionCategories = new Set([
  "business_admission",
  "buyer_acceptance",
  "commercial_certification",
  "commercial_feasibility",
  "commercial_liability",
  "commercial_model",
  "product_fit",
  "settlement",
  "supply_certification",
  "supply_chain"
]);

const validationCategories = new Set([
  "bidding",
  "callbacks",
  "commercial_validation",
  "controlled_pilot",
  "data_validation",
  "functional_validation",
  "launch_gate",
  "privacy_certification",
  "scale_governance",
  "technical_certification",
  "testing",
  "vast_execution"
]);

const technicalSpecificationCategories = new Set([
  "api_mapping",
  "architecture_boundary",
  "build",
  "credentials",
  "ctv_playback",
  "data_spec",
  "dependencies",
  "dependency",
  "device_capability",
  "event_correlation",
  "event_spec",
  "initialization",
  "integration_route",
  "lifecycle_events",
  "logging",
  "manifest",
  "network_spec",
  "obfuscation",
  "platform",
  "playbook",
  "player",
  "process",
  "protocol_spec",
  "release",
  "security",
  "security_performance_spec",
  "test_environment",
  "vast",
  "video_spec"
]);

const checkGuidanceOverrides: Partial<
  Record<string, Partial<IntegrationCheckGuidance>>
> = {
  "TQ-001": {
    requiredInput:
      "Record the PG integration owner plus the media engineering lead's name, email or IM handle, timezone, response SLA, and escalation contact.",
    requiredInputZh:
      "填写 PG 技术对接负责人，以及媒体研发负责人的姓名、邮箱/即时通讯、时区、响应时效和升级联系人。",
    evidenceExpectation:
      "Attach the confirmed project contact list or kickoff record with both organizations' accountable contacts.",
    evidenceExpectationZh:
      "提交双方已确认的项目联系人清单或启动会记录，明确技术主责和升级路径。"
  },
  "TQ-011": {
    requiredInput:
      "Record the contracting entity, property owner, traffic source, monetization authorization, inventory controller, and any reseller relationship.",
    requiredInputZh:
      "填写签约主体、媒体资产所有方、流量来源、商业化授权方、库存控制方及是否存在转售关系。",
    evidenceExpectation:
      "Attach business registration, authorization letter, ownership proof, inventory-control declaration, and reseller disclosure where applicable.",
    evidenceExpectationZh:
      "提交主体资质、授权书、媒体资产归属证明、库存控制声明及适用的转售披露。"
  },
  "TQ-014": {
    requiredInput:
      "Provide geography, DAU or MAU, daily ad requests, placement traffic, fill rate, CPM or eCPM, revenue history, and IVT or quality history.",
    requiredInputZh:
      "填写流量地区、DAU/MAU、日广告请求、广告位流量、填充率、CPM/eCPM、历史收入及 IVT/质量历史。",
    evidenceExpectation:
      "Attach a dated traffic export or analytics report with source system, measurement period, and field definitions.",
    evidenceExpectationZh:
      "提交带日期的流量导出或分析报告，注明数据来源、统计周期和字段口径。"
  },
  "BIZ-001": {
    requiredInput:
      "Record buyer demand fit, eligible geographies and formats, revenue estimate, integration effort, expected payback, and go or no-go priority.",
    requiredInputZh:
      "填写需求方匹配、可售地区与形式、收入测算、接入投入、预计回收周期和 Go/No-Go 优先级结论。"
  },
  "BIZ-002": {
    requiredInput:
      "For each placement, record trigger, container, visibility, format, frequency cap, creative review rule, and forecast request volume.",
    requiredInputZh:
      "逐广告位填写触发时机、展示容器、可视性、广告形式、频控、素材审核规则和预计请求量。"
  },
  "TQ-012": {
    requiredInput:
      "Confirm traffic channel, integration mode, delivery protocols, existing ad stack, lifecycle-event capability, IVT SDK acceptance, and the approved route decision.",
    requiredInputZh:
      "确认流量渠道、接入模式、交付协议、现有广告技术栈、生命周期事件能力、是否接受 IVT SDK 及最终方案结论。"
  },
  "TQ-013": {
    requiredInput:
      "Record bundle or domain, publisher and seller IDs, app-ads.txt or ads.txt URL, sellers.json entry, schain nodes, and DIRECT or RESELLER relationship.",
    requiredInputZh:
      "填写 Bundle/域名、Publisher/Seller ID、app-ads.txt/ads.txt 地址、sellers.json 记录、schain 节点及 DIRECT/RESELLER 关系。",
    evidenceExpectation:
      "Attach public declaration URLs, validation output, seller identity evidence, schain sample, and DSP recognition result.",
    evidenceExpectationZh:
      "提交公开声明地址、校验结果、Seller 身份证明、schain 样例及 DSP 识别结果。"
  },
  "TQ-007": {
    requiredInput:
      "Record every collected identifier and data category, purpose, legal basis, retention, transfer destination, cross-border status, and deletion method.",
    requiredInputZh:
      "逐项填写采集标识符与数据类别、用途、合法依据、保留周期、传输对象、是否跨境及删除方式。"
  },
  "COM-001": {
    requiredInput:
      "Record buying model, floor or target price, currency, revenue share, demand source, minimum revenue expectation, and commercial owner approval.",
    requiredInputZh:
      "填写采购模式、底价/目标价、币种、分成比例、需求来源、最低收入预期及商务责任人批准。"
  },
  "COM-002": {
    requiredInput:
      "Record billable event, IVT deduction rule, reconciliation source, timezone, currency, delta tolerance, invoice process, and payment cycle.",
    requiredInputZh:
      "填写计费事件、IVT 扣减规则、对账数据源、时区、币种、差异容忍、开票流程和付款周期。"
  }
};

export function getIntegrationCheckGuidance(
  template: IntegrationChecklistTemplate
): IntegrationCheckGuidance {
  const mediaProvided = template.responsibleParty === "MEDIA_ENGINEERING";
  const subject = template.title;
  const subjectZh = template.titleZh;

  let evidenceExpectation =
    "Attach a traceable document, ticket, URL, screenshot, or decision record that proves the conclusion.";
  let evidenceExpectationZh =
    "提交可追溯的文档、工单、URL、截图或决策记录，用于证明本项结论。";

  if (businessDecisionCategories.has(template.category)) {
    evidenceExpectation =
      "Attach the approved assessment, commercial terms, authorization record, or accountable-owner decision.";
    evidenceExpectationZh =
      "提交已批准的评估报告、商务条款、授权记录或责任人决策记录。";
  } else if (validationCategories.has(template.category)) {
    evidenceExpectation =
      "Attach a test report or production trace with environment, request or event IDs, timestamps, result, and KPI conclusion.";
    evidenceExpectationZh =
      "提交测试报告或生产链路证据，包含环境、请求/事件 ID、时间戳、结果和 KPI 结论。";
  } else if (technicalSpecificationCategories.has(template.category)) {
    evidenceExpectation =
      "Attach the versioned specification, configuration, architecture diagram, sample payload, build output, or diagnostic log.";
    evidenceExpectationZh =
      "提交带版本的技术规格、配置、架构图、样例报文、构建产物或诊断日志。";
  } else if (["privacy", "consent"].includes(template.category)) {
    evidenceExpectation =
      "Attach the approved privacy review, consent flow, field whitelist, policy link, or legal decision.";
    evidenceExpectationZh =
      "提交已批准的隐私评审、授权流程、字段白名单、政策链接或法务结论。";
  } else if (
    [
      "ctv_inventory",
      "dooh_inventory",
      "formats",
      "mobile_inventory",
      "pc_environment",
      "placements",
      "traffic_quality"
    ].includes(template.category)
  ) {
    evidenceExpectation =
      "Attach the inventory or traffic sheet with property, placement, format, volume, trigger, frequency, and ownership details.";
    evidenceExpectationZh =
      "提交库存或流量明细，覆盖媒体属性、广告位、形式、量级、触发、频控和归属信息。";
  }

  const guidance: IntegrationCheckGuidance = {
    requiredInput: mediaProvided
      ? `Ask media engineering to provide the concrete values and scope needed to complete: ${subject}.`
      : `Record the concrete values, scope, decision owner, and conclusion needed to complete: ${subject}.`,
    requiredInputZh: mediaProvided
      ? `请媒体研发提供完成“${subjectZh}”所需的具体参数、范围和现状说明。`
      : `补充完成“${subjectZh}”所需的具体数据、适用范围、决策责任人与结论。`,
    evidenceExpectation,
    evidenceExpectationZh,
    passCriteria:
      "All required values are complete, evidence is traceable, the accountable owner has confirmed the conclusion, and no unresolved blocker remains.",
    passCriteriaZh:
      "必填信息完整、证据可追溯、责任人已确认结论，且不存在未解决阻塞后方可通过。"
  };

  return {
    ...guidance,
    ...checkGuidanceOverrides[template.code]
  };
}

const checklistTemplates: IntegrationChecklistTemplate[] = [
  {
    code: "TQ-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "ownership",
    title: "Assign internal integration owner and media engineering contact",
    titleZh: "分配内部集成负责人和媒体研发联系人",
    ownerRole: "media_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "platform",
    title: "Record Android SDK and build-tool versions",
    titleZh: "记录 Android SDK 与构建工具版本",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-003",
    stage: "TECHNICAL_QUALIFICATION",
    category: "process",
    title: "Confirm main and secondary process architecture",
    titleZh: "确认主进程与辅助进程架构",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-004",
    stage: "TECHNICAL_QUALIFICATION",
    category: "dependencies",
    title: "Review dependency tree, AndroidX, R8, and resource shrinking",
    titleZh: "审核依赖树、AndroidX、R8 与资源压缩",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-005",
    stage: "TECHNICAL_QUALIFICATION",
    category: "playbook",
    title: "Pin SDK playbooks and source versions",
    titleZh: "锁定 SDK Playbook 与来源版本",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-006",
    stage: "TECHNICAL_QUALIFICATION",
    category: "placements",
    title: "Map planned formats to logical placements",
    titleZh: "将计划广告形式映射到逻辑广告位",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "TQ-007",
    stage: "TECHNICAL_QUALIFICATION",
    category: "privacy",
    title: "Complete privacy data-category profile",
    titleZh: "完成隐私数据类别画像",
    ownerRole: "legal_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-008",
    stage: "TECHNICAL_QUALIFICATION",
    category: "consent",
    title: "Confirm consent timing and personalized advertising setting",
    titleZh: "确认授权时序与个性化广告设置",
    ownerRole: "legal_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-009",
    stage: "TECHNICAL_QUALIFICATION",
    category: "testing",
    title: "Define real-device and API-level test matrix",
    titleZh: "定义真机与 API Level 测试矩阵",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-010",
    stage: "TECHNICAL_QUALIFICATION",
    category: "security",
    title: "Define credential provisioning and secret-manager path",
    titleZh: "定义凭证发放与密钥管理路径",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-011",
    stage: "TECHNICAL_QUALIFICATION",
    category: "business_admission",
    title: "Verify media entity, traffic ownership, inventory control, monetization rights, and resale disclosure",
    titleZh: "核验媒体主体、流量所有权、库存控制权、商业化授权与转售披露",
    ownerRole: "media_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-012",
    stage: "TECHNICAL_QUALIFICATION",
    category: "integration_route",
    title: "Approve channel, integration mode, protocols, and capability fit",
    titleZh: "批准流量渠道、接入模式、协议与能力匹配",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-013",
    stage: "TECHNICAL_QUALIFICATION",
    category: "supply_chain",
    title: "Verify publisher identity, app-ads.txt, sellers.json, schain, and resale relationship",
    titleZh: "核验媒体身份、app-ads.txt、sellers.json、schain 与转售关系",
    ownerRole: "legal_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-014",
    stage: "TECHNICAL_QUALIFICATION",
    category: "traffic_quality",
    title: "Quantify traffic geography, quality, scale, fill, CPM, revenue, and IVT history",
    titleZh: "量化流量地区、质量、规模、填充率、CPM、收入与 IVT 历史",
    ownerRole: "media_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "BIZ-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "commercial_feasibility",
    title: "Approve demand fit, revenue estimate, integration cost, ROI, and commercial priority",
    titleZh: "批准需求匹配、收入测算、接入成本、ROI 与商业优先级",
    ownerRole: "sales_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "BIZ-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "product_fit",
    title: "Approve placement visibility, triggers, formats, frequency, review rules, and traffic forecast",
    titleZh: "批准广告位可视性、触发、形式、频控、审核规则与流量预估",
    ownerRole: "media_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "COM-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "commercial_model",
    title: "Approve buying model, pricing, revenue share, demand source, and minimum revenue commitment",
    titleZh: "批准采购模式、价格、分成、需求来源与最低收入约定",
    ownerRole: "sales_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "COM-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "settlement",
    title: "Approve billable events, IVT deductions, reconciliation source, delta tolerance, and payment cycle",
    titleZh: "批准计费事件、IVT 扣减、对账依据、差异容忍与付款周期",
    ownerRole: "finance_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "COM-003",
    stage: "TECHNICAL_QUALIFICATION",
    category: "commercial_liability",
    title: "Approve traffic, technical, complaint, refund, and invalid-traffic liability terms",
    titleZh: "批准流量、技术、投诉、退款与无效流量责任条款",
    ownerRole: "legal_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SUP-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "buyer_acceptance",
    title: "Verify primary DSP recognition, domain or app validation, brand safety, and historical supply risk",
    titleZh: "核验主要 DSP 识别、域名或 App 验证、品牌安全与历史供应风险",
    ownerRole: "adops_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-015",
    stage: "TECHNICAL_QUALIFICATION",
    category: "architecture_boundary",
    title: "Approve technical architecture, system boundaries, and responsibility matrix",
    titleZh: "批准技术架构、系统边界与双方责任矩阵",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "MOB-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "mobile_inventory",
    title: "Document each mobile placement, trigger, container, cache, frequency, and traffic forecast",
    titleZh: "逐广告位记录触发、容器、缓存、频控与流量预估",
    ownerRole: "media_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["mobile"]
  },
  {
    code: "MOB-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "event_correlation",
    title: "Map app session, IVT session, request, bid, impression, creative, and placement IDs",
    titleZh: "映射 App、IVT、请求、竞价、曝光、素材与广告位标识",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["mobile"],
    modes: ["ivt_sdk_api"]
  },
  {
    code: "CTV-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "ctv_inventory",
    title: "Document CTV inventory, ad breaks, pod rules, remote behavior, and content recovery",
    titleZh: "记录 CTV 库存、广告 Break、Pod、遥控器行为与内容恢复",
    ownerRole: "media_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["ctv"]
  },
  {
    code: "CTV-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "player",
    title: "Verify playback controls, player state, ad events, visibility, and foreground signals",
    titleZh: "核验播放控制、播放器状态、广告事件、可见性与前台信号",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["ctv"]
  },
  {
    code: "CTV-003",
    stage: "TECHNICAL_QUALIFICATION",
    category: "vast",
    title: "Approve VAST version, wrappers, tracking, errors, impressions, pods, and timeouts",
    titleZh: "批准 VAST 版本、Wrapper、Tracking、错误、曝光、Pod 与超时规则",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["ctv"],
    protocols: ["vast"]
  },
  {
    code: "CTV-004",
    stage: "TECHNICAL_QUALIFICATION",
    category: "video_spec",
    title: "Lock video resolution, codec, bitrate, duration, CDN, and device compatibility matrix",
    titleZh: "锁定视频分辨率、编码、码率、时长、CDN 与设备兼容矩阵",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["ctv"]
  },
  {
    code: "DOOH-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "dooh_inventory",
    title: "Verify screen ownership, point list, connectivity, proof of play, and device heartbeat",
    titleZh: "核验屏幕所有权、点位、联网、播放证明与设备心跳",
    ownerRole: "media_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["dooh"]
  },
  {
    code: "PC-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "pc_environment",
    title: "Verify client, WebView, container visibility, identifiers, callbacks, and update mechanism",
    titleZh: "核验客户端、WebView、容器可见性、标识符、回调与更新机制",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["pc"]
  },
  {
    code: "CD-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "device_capability",
    title: "Verify device OS, connectivity, compute, rendering, interaction, privacy, and security limits",
    titleZh: "核验设备系统、联网、算力、展现、交互、隐私与安全边界",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["connected_device"]
  },
  {
    code: "SPEC-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "protocol_spec",
    title: "Lock SDK, API, OpenRTB or VAST versions, fields, errors, macros, timeouts, and retries",
    titleZh: "锁定 SDK、API、OpenRTB 或 VAST 版本、字段、错误码、宏、超时与重试",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SPEC-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "event_spec",
    title: "Lock initialization, request, response, load, impression, click, video, close, and error events",
    titleZh: "锁定初始化、请求、返回、加载、曝光、点击、视频、关闭与错误事件",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SPEC-003",
    stage: "TECHNICAL_QUALIFICATION",
    category: "data_spec",
    title: "Lock app, device, consent, supply-chain, deal, placement, creative, request, and IVT identifiers",
    titleZh: "锁定 App、设备、授权、供应链、Deal、广告位、素材、请求与 IVT 标识",
    ownerRole: "data_analyst",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SPEC-004",
    stage: "TECHNICAL_QUALIFICATION",
    category: "network_spec",
    title: "Approve domains, CDN, HTTPS, TLS, allowlists, DNS, overseas access, IP, proxy, and certificates",
    titleZh: "批准域名、CDN、HTTPS、TLS、白名单、DNS、海外访问、IP、代理与证书",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SPEC-005",
    stage: "TECHNICAL_QUALIFICATION",
    category: "security_performance_spec",
    title: "Approve package size, CPU, memory, crash, ANR, obfuscation, process, storage, log, and encryption limits",
    titleZh: "批准包体、CPU、内存、Crash、ANR、混淆、进程、存储、日志与加密边界",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SPEC-006",
    stage: "TECHNICAL_QUALIFICATION",
    category: "test_environment",
    title: "Provision test app, account, placements, creatives, devices, countries, endpoints, logs, and packet capture",
    titleZh: "准备测试 App、账号、广告位、素材、设备、国家、Endpoint、日志与抓包方式",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-001",
    stage: "SDK_INTEGRATION",
    category: "release",
    title: "Record SDK artifact version, source, and SHA-256",
    titleZh: "记录 SDK 产物版本、来源与 SHA-256",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-002",
    stage: "SDK_INTEGRATION",
    category: "dependency",
    title: "Import dependencies and required adapters",
    titleZh: "导入依赖与所需适配器",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-003",
    stage: "SDK_INTEGRATION",
    category: "manifest",
    title: "Configure manifest, providers, network, and permissions",
    titleZh: "配置 Manifest、Provider、网络与权限",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-004",
    stage: "SDK_INTEGRATION",
    category: "obfuscation",
    title: "Apply R8, ProGuard, and resource keep rules",
    titleZh: "应用 R8、ProGuard 与资源保留规则",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-005",
    stage: "SDK_INTEGRATION",
    category: "credentials",
    title: "Bind masked application identity and secret reference",
    titleZh: "绑定脱敏应用标识与密钥引用",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-006",
    stage: "SDK_INTEGRATION",
    category: "initialization",
    title: "Initialize after consent and only in the intended process",
    titleZh: "在授权后且仅在目标进程初始化",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-007",
    stage: "SDK_INTEGRATION",
    category: "privacy",
    title: "Implement selected identifier and privacy controls",
    titleZh: "实施选定的标识符与隐私控制",
    ownerRole: "legal_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-008",
    stage: "SDK_INTEGRATION",
    category: "logging",
    title: "Capture test diagnostics and define production log shutdown",
    titleZh: "采集测试诊断并定义生产日志关闭规则",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-009",
    stage: "SDK_INTEGRATION",
    category: "formats",
    title: "Implement every planned ad format and lifecycle",
    titleZh: "实现所有计划广告形式与生命周期",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "SDK-010",
    stage: "SDK_INTEGRATION",
    category: "callbacks",
    title: "Implement load, render, show, impression, click, close, and error callbacks",
    titleZh: "实现加载、渲染、展示、曝光、点击、关闭与错误回调",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "SDK-011",
    stage: "SDK_INTEGRATION",
    category: "origin_ads",
    title: "Use one Origin placement ID per logical placement",
    titleZh: "每个逻辑广告位使用唯一 Origin Placement ID",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_ADS"
  },
  {
    code: "SDK-012",
    stage: "SDK_INTEGRATION",
    category: "direct_ads",
    title: "Verify vendor AppId, key, slot, and callback mapping",
    titleZh: "核验厂商 AppId、密钥、广告位与回调映射",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "DIRECT_ADS"
  },
  {
    code: "SDK-013",
    stage: "SDK_INTEGRATION",
    category: "mediation",
    title: "Configure each network adapter and placement mapping",
    titleZh: "配置每个广告网络适配器与广告位映射",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "MEDIATION"
  },
  {
    code: "SDK-014",
    stage: "SDK_INTEGRATION",
    category: "mediation",
    title: "Verify privacy propagation and channel fallback behavior",
    titleZh: "核验隐私透传与渠道降级行为",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "MEDIATION"
  },
  {
    code: "SDK-015",
    stage: "SDK_INTEGRATION",
    category: "bidding",
    title: "Document eCPM units and implement idempotent win/loss notification",
    titleZh: "明确 eCPM 单位并实现幂等竞胜/竞败回传",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "BIDDING"
  },
  {
    code: "SDK-016",
    stage: "SDK_INTEGRATION",
    category: "ivt",
    title: "Enable Origin antifraud capability and preserve three-state semantics",
    titleZh: "启用 Origin 反作弊能力并保持三态语义",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_IVT"
  },
  {
    code: "SDK-017",
    stage: "SDK_INTEGRATION",
    category: "ivt",
    title: "Verify offline recovery, multiprocess behavior, and recheck schedule",
    titleZh: "核验离线恢复、多进程行为与复检调度",
    ownerRole: "data_analyst",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_IVT"
  },
  {
    code: "SDK-018",
    stage: "SDK_INTEGRATION",
    category: "build",
    title: "Produce a test build with version, hash, and release notes",
    titleZh: "产出包含版本、Hash 与发布说明的测试包",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "API-001",
    stage: "SDK_INTEGRATION",
    category: "api_mapping",
    title: "Map application, device, ad, privacy, and supply-chain request fields",
    titleZh: "映射应用、设备、广告、隐私与供应链请求字段",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    modes: ["ivt_sdk_api", "lightweight_sdk_api"]
  },
  {
    code: "API-002",
    stage: "SDK_INTEGRATION",
    category: "lifecycle_events",
    title: "Verify request, load, render, impression, click, close, video, and error events end to end",
    titleZh: "端到端核验请求、加载、渲染、曝光、点击、关闭、视频与错误事件",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    modes: ["ivt_sdk_api", "lightweight_sdk_api"]
  },
  {
    code: "VAST-001",
    stage: "SDK_INTEGRATION",
    category: "vast_execution",
    title: "Validate wrapper expansion, tracking ownership, error URLs, and duplicate suppression",
    titleZh: "验证 Wrapper 展开、Tracking 责任、错误 URL 与重复抑制",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    protocols: ["vast"]
  },
  {
    code: "VAST-002",
    stage: "SDK_INTEGRATION",
    category: "ctv_playback",
    title: "Test first frame, playback, quartiles, completion, content recovery, and report reconciliation",
    titleZh: "测试首帧、播放、四分位、完播、内容恢复与报表对账",
    ownerRole: "data_analyst",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON",
    channels: ["ctv"],
    protocols: ["vast"]
  },
  {
    code: "TEST-001",
    stage: "SDK_INTEGRATION",
    category: "functional_validation",
    title: "Pass functional integration for initialization, requests, creatives, rendering, interaction, lifecycle, and errors",
    titleZh: "通过初始化、请求、素材、渲染、交互、生命周期与错误处理功能联调",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TEST-002",
    stage: "SDK_INTEGRATION",
    category: "data_validation",
    title: "Pass ID correlation, event deduplication, VAST completeness, timezone, retry, and log reconciliation",
    titleZh: "通过 ID 关联、事件去重、VAST 完整性、时区、重试与日志对账联调",
    ownerRole: "data_analyst",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TEST-003",
    stage: "SDK_INTEGRATION",
    category: "commercial_validation",
    title: "Prove DSP recognition, creative approval, live bidding, pricing, restrictions, and settlement output",
    titleZh: "验证 DSP 识别、素材审核、真实出价、价格、限制规则与结算输出",
    ownerRole: "adops_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "CERT-001",
    stage: "SDK_INTEGRATION",
    category: "technical_certification",
    title: "Certify initialization, crash, ANR, request, display, playback, first-frame, event, and weak-network KPIs",
    titleZh: "认证初始化、Crash、ANR、请求、展示、播放、首帧、事件与弱网 KPI",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "CERT-002",
    stage: "SDK_INTEGRATION",
    category: "privacy_certification",
    title: "Certify consent, withdrawal, field policy, data boundary, and SDK privacy disclosure",
    titleZh: "认证用户授权、撤回、字段政策、数据边界与 SDK 隐私披露",
    ownerRole: "legal_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "CERT-003",
    stage: "SDK_INTEGRATION",
    category: "supply_certification",
    title: "Certify bundle, publisher, seller, app-ads.txt, sellers.json, schain, domain, and DSP recognition",
    titleZh: "认证 Bundle、Publisher、Seller、app-ads.txt、sellers.json、schain、域名与 DSP 识别",
    ownerRole: "adops_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "CERT-004",
    stage: "SDK_INTEGRATION",
    category: "commercial_certification",
    title: "Certify production budget, creative review, price, revenue share, billable impressions, and reconciliation file",
    titleZh: "认证生产预算、素材审核、价格、分成、可结算曝光与对账文件",
    ownerRole: "finance_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "LAUNCH-001",
    stage: "SDK_INTEGRATION",
    category: "launch_gate",
    title: "Record joint technical, privacy, supply, commercial, and operations launch approval",
    titleZh: "记录技术、隐私、供应链、商业与运营联合上线批准",
    ownerRole: "media_director",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "PILOT-001",
    stage: "SDK_INTEGRATION",
    category: "controlled_pilot",
    title: "Run controlled production traffic and prove auction, display, quality, revenue, and reconciliation KPIs",
    titleZh: "执行受控生产流量并验证竞价、展示、质量、收入与对账 KPI",
    ownerRole: "adops_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SCALE-001",
    stage: "SDK_INTEGRATION",
    category: "scale_governance",
    title: "Approve scale operation, close pilot issues, and establish recurring supply, version, quality, and commercial governance",
    titleZh: "批准规模化运营、关闭 Pilot 问题并建立供应链、版本、质量与商业持续治理",
    ownerRole: "adops_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  }
];

const integrationWorkflowPhaseByCheckCode: Record<string, IntegrationWorkflowPhaseIndex> = {
  "TQ-001": 0,
  "TQ-011": 0,
  "TQ-014": 1,
  "BIZ-001": 1,
  "TQ-006": 2,
  "BIZ-002": 2,
  "MOB-001": 2,
  "CTV-001": 2,
  "DOOH-001": 2,
  "TQ-012": 3,
  "COM-001": 4,
  "COM-002": 4,
  "COM-003": 4,
  "TQ-013": 5,
  "SUP-001": 5,
  "TQ-007": 6,
  "TQ-008": 6,
  "TQ-003": 7,
  "TQ-004": 7,
  "TQ-015": 7,
  "CTV-002": 7,
  "PC-001": 7,
  "CD-001": 7,
  "TQ-002": 8,
  "TQ-005": 8,
  "TQ-009": 8,
  "TQ-010": 8,
  "MOB-002": 8,
  "CTV-003": 8,
  "CTV-004": 8,
  "SPEC-001": 8,
  "SPEC-002": 8,
  "SPEC-003": 8,
  "SPEC-004": 8,
  "SPEC-005": 8,
  "SPEC-006": 8,
  "SDK-001": 9,
  "SDK-002": 9,
  "SDK-003": 9,
  "SDK-004": 9,
  "SDK-005": 9,
  "SDK-006": 9,
  "SDK-007": 9,
  "SDK-008": 9,
  "SDK-009": 9,
  "SDK-010": 9,
  "SDK-011": 9,
  "SDK-012": 9,
  "SDK-013": 9,
  "SDK-014": 9,
  "SDK-015": 9,
  "SDK-016": 9,
  "SDK-017": 9,
  "SDK-018": 9,
  "API-001": 9,
  "API-002": 9,
  "VAST-001": 9,
  "VAST-002": 9,
  "TEST-001": 9,
  "TEST-002": 9,
  "TEST-003": 9,
  "CERT-001": 10,
  "CERT-002": 10,
  "CERT-003": 10,
  "CERT-004": 10,
  "LAUNCH-001": 10,
  "PILOT-001": 11,
  "SCALE-001": 12
};

const oversightRoles = new Set<RoleCode>(["integration_manager", "media_director", "operations_director"]);
const secretReferencePattern = /^(vault|secret|env|vercel|supabase):\/\/[a-z0-9/_-]+$/i;

function allowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function blocked(message: string, reasonCode: string, requiredRole?: RoleCode): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredRole,
    audit_required: true
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  publisherId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent,
  metadata?: Record<string, unknown>
) {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "publisher", guard, publisherId, metadata);
  const nextState: MediaWorkflowState = {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };

  return { nextState, auditEvent };
}

function businessEvent(
  eventCode: string,
  publisherId: EntityId,
  ownerRole: RoleCode,
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType: "publisher",
    objectId: publisherId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function selectedPlaybooks(profile?: IntegrationProjectProfile) {
  const selected = new Set(profile?.playbook_codes ?? []);
  return integrationPlaybooks.filter((playbook) => selected.has(playbook.code));
}

function appliesToProfile(template: IntegrationChecklistTemplate, profile?: IntegrationProjectProfile) {
  const selected = selectedPlaybooks(profile);
  const kinds = new Set(selected.map((playbook) => playbook.kind));
  let playbookApplies = template.appliesTo === "COMMON";

  if (template.appliesTo === "ADS") playbookApplies = selected.some((playbook) => playbook.kind !== "origin_ivt");
  if (template.appliesTo === "DIRECT_ADS") playbookApplies = kinds.has("direct_ads");
  if (template.appliesTo === "MEDIATION") playbookApplies = kinds.has("mediation");
  if (template.appliesTo === "ORIGIN_ADS") playbookApplies = kinds.has("origin_ads");
  if (template.appliesTo === "ORIGIN_IVT") playbookApplies = kinds.has("origin_ivt");
  if (template.appliesTo === "BIDDING") {
    playbookApplies = selected.some((playbook) =>
      ["fangge_android_reference", "tobid_android_reference", "beizi_android_reference"].includes(playbook.code)
    );
  }

  if (!playbookApplies) return false;
  if (template.channels && (!profile || !template.channels.includes(profile.traffic_channel))) return false;
  if (template.modes && (!profile || !template.modes.includes(profile.integration_mode))) return false;
  if (
    template.protocols &&
    (!profile || !template.protocols.some((protocol) => profile.protocol_codes.includes(protocol)))
  ) {
    return false;
  }

  return true;
}

export function recommendedIntegrationMode(
  channel: IntegrationTrafficChannel,
  capability: IntegrationCapabilityProfile
): IntegrationMode {
  if (channel === "mobile") {
    return capability.has_ad_server &&
      capability.supports_api &&
      capability.supports_lifecycle_events &&
      capability.accepts_ivt_sdk
      ? "ivt_sdk_api"
      : "full_sdk";
  }
  if (channel === "ctv") {
    return capability.has_ad_player &&
      (capability.supports_vast || capability.supports_api) &&
      capability.supports_lifecycle_events &&
      capability.accepts_ivt_sdk
      ? "ivt_sdk_api"
      : "player_component";
  }
  return "lightweight_sdk_api";
}

export function integrationRouteIssues(input: IntegrationProjectProfileInput) {
  const issues: string[] = [];
  const API_PROTOCOLS: IntegrationProtocol[] = ["api", "openrtb", "vast", "private_protocol"];

  if (input.protocolCodes.length === 0) issues.push("Select at least one delivery protocol.");
  if (input.integrationMode === "ivt_sdk_api") {
    if (!input.capabilityProfile.accepts_ivt_sdk) {
      issues.push("IVT SDK + API requires media approval to integrate the IVT SDK.");
    }
    if (!input.capabilityProfile.supports_lifecycle_events) {
      issues.push("IVT SDK + API requires complete advertising lifecycle events.");
    }
    if (!input.capabilityProfile.has_ad_server) {
      issues.push("IVT SDK + API requires an existing media ad server or equivalent decisioning system.");
    }
    if (!input.protocolCodes.some((protocol) => API_PROTOCOLS.includes(protocol))) {
      issues.push("IVT SDK + API requires API, OpenRTB, VAST, or an approved private protocol.");
    }
  }
  if (input.integrationMode === "full_sdk" && !input.protocolCodes.includes("native_sdk")) {
    issues.push("Poly-Gamma full SDK requires the Native SDK protocol.");
  }
  if (input.integrationMode === "player_component" && input.trafficChannel !== "ctv") {
    issues.push("The player-component route is restricted to CTV projects.");
  }
  if (
    input.integrationMode === "lightweight_sdk_api" &&
    !["dooh", "pc", "connected_device"].includes(input.trafficChannel)
  ) {
    issues.push("The lightweight SDK + API route is reserved for DOOH, PC, or connected devices.");
  }
  if (input.trafficChannel === "ctv" && input.integrationMode === "ivt_sdk_api") {
    if (!input.capabilityProfile.has_ad_player) {
      issues.push("CTV IVT + API requires an existing advertising-capable media player.");
    }
    if (!input.capabilityProfile.supports_vast && !input.capabilityProfile.supports_api) {
      issues.push("CTV IVT + API requires VAST or API delivery capability.");
    }
  }
  if (input.trafficChannel === "mobile" && input.integrationMode === "ivt_sdk_api" && !input.capabilityProfile.supports_api) {
    issues.push("Mobile IVT + API requires advertising API capability.");
  }

  return issues;
}

function profileIssues(input: IntegrationProjectProfileInput) {
  const issues = integrationRouteIssues(input);
  const hasAdsPlaybook = input.playbookCodes.some(
    (code) => integrationPlaybooks.find((playbook) => playbook.code === code)?.kind !== "origin_ivt"
  );
  const hasIvtPlaybook = input.playbookCodes.includes("origin_ivt_android_v11");
  const hasOriginAdsPlaybook = input.playbookCodes.includes("origin_ads_android_1_2");

  if (!input.propertyIdentifier.trim()) issues.push("Media property package or platform identifier is required.");
  if (input.playbookCodes.length === 0) issues.push("Select at least one SDK playbook.");
  if (input.integrationMode === "ivt_sdk_api" && !hasIvtPlaybook) {
    issues.push("IVT SDK + API requires the Origin IVT playbook.");
  }
  if (["full_sdk", "player_component"].includes(input.integrationMode) && !hasOriginAdsPlaybook) {
    issues.push("The selected full SDK route requires the Origin Ads playbook.");
  }
  if (!input.mediaEngineeringContact.trim()) issues.push("Media engineering contact is required.");
  if (input.platform !== "other" && (!input.minSdk || !input.targetSdk || !input.compileSdk)) {
    issues.push("Android minSdk, targetSdk, and compileSdk are required.");
  }
  if (input.privacyProfile.consent_before_init !== true) {
    issues.push("Consent-before-initialization must be confirmed.");
  }
  if (hasAdsPlaybook && input.plannedFormats.length === 0) {
    issues.push("Select at least one planned ad format for an advertising playbook.");
  }
  if (input.secretReference?.trim() && !secretReferencePattern.test(input.secretReference.trim())) {
    issues.push("Secret values are forbidden. Use a vault://, secret://, env://, vercel://, or supabase:// reference.");
  }

  return issues;
}

function profileFromInput(
  projectId: EntityId,
  user: BusinessUser,
  input: IntegrationProjectProfileInput,
  existing?: IntegrationProjectProfile
): IntegrationProjectProfile {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    integration_project_id: projectId,
    platform: input.platform,
    traffic_channel: input.trafficChannel,
    integration_mode: input.integrationMode,
    protocol_codes: [...new Set(input.protocolCodes)],
    capability_profile: { ...input.capabilityProfile },
    property_identifier: input.propertyIdentifier.trim(),
    playbook_codes: [...new Set(input.playbookCodes)],
    min_sdk: input.minSdk,
    target_sdk: input.targetSdk,
    compile_sdk: input.compileSdk,
    agp_version: input.agpVersion?.trim() || undefined,
    gradle_version: input.gradleVersion?.trim() || undefined,
    language: input.language,
    process_model: input.processModel,
    media_engineering_contact: input.mediaEngineeringContact.trim(),
    planned_formats: [...new Set(input.plannedFormats)],
    privacy_profile: { ...input.privacyProfile },
    target_pilot_date: input.targetPilotDate || undefined,
    secret_reference: input.secretReference?.trim() || undefined,
    created_by: existing?.created_by ?? user.id,
    updated_by: user.id,
    created_at: existing?.created_at ?? now,
    updated_at: now
  };
}

function profileToInput(profile: IntegrationProjectProfile): IntegrationProjectProfileInput {
  return {
    platform: profile.platform,
    trafficChannel: profile.traffic_channel,
    integrationMode: profile.integration_mode,
    protocolCodes: profile.protocol_codes,
    capabilityProfile: profile.capability_profile,
    propertyIdentifier: profile.property_identifier,
    playbookCodes: profile.playbook_codes,
    minSdk: profile.min_sdk,
    targetSdk: profile.target_sdk,
    compileSdk: profile.compile_sdk,
    agpVersion: profile.agp_version,
    gradleVersion: profile.gradle_version,
    language: profile.language,
    processModel: profile.process_model,
    mediaEngineeringContact: profile.media_engineering_contact,
    plannedFormats: profile.planned_formats,
    privacyProfile: profile.privacy_profile,
    targetPilotDate: profile.target_pilot_date,
    secretReference: profile.secret_reference
  };
}

export function integrationWorkflowPhaseForCheck(itemCode: string): IntegrationWorkflowPhaseIndex {
  return integrationWorkflowPhaseByCheckCode[itemCode] ?? 9;
}

export function integrationChecklistForProfile(profile?: IntegrationProjectProfile) {
  return checklistTemplates
    .filter((template) => appliesToProfile(template, profile))
    .sort(
      (left, right) =>
        integrationWorkflowPhaseForCheck(left.code) - integrationWorkflowPhaseForCheck(right.code)
    );
}

export function incompleteIntegrationChecks(
  state: MediaWorkflowState,
  projectId: EntityId,
  profile?: IntegrationProjectProfile
) {
  const resultByCode = new Map(
    state.integrationCheckResults
      .filter((result) => result.integration_project_id === projectId)
      .map((result) => [result.item_code, result])
  );

  return integrationChecklistForProfile(profile).filter((template) => {
    const status = resultByCode.get(template.code)?.status ?? "not_started";
    return (
      integrationWorkflowPhaseForCheck(template.code) <= 10 &&
      template.blocking &&
      !["passed", "waived"].includes(status)
    );
  });
}

function integrationPhaseTargetDate(targetPilotDate: string | undefined, offsetDays: number) {
  if (!targetPilotDate) return undefined;
  const target = new Date(`${targetPilotDate}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return undefined;
  target.setUTCDate(target.getUTCDate() + offsetDays);
  return target.toISOString().slice(0, 10);
}

export class SdkIntegrationService {
  getWorkspaceSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    const publisher = state.publishers.find((item) => item.id === publisherId);
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    const profile = project
      ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
      : undefined;
    const results = project
      ? state.integrationCheckResults.filter((item) => item.integration_project_id === project.id)
      : [];
    const resultByCode = new Map(results.map((result) => [result.item_code, result]));
    const items = integrationChecklistForProfile(profile).map((template) => {
      const result = resultByCode.get(template.code);
      return {
        template,
        workflowPhase: integrationWorkflowPhaseForCheck(template.code),
        result,
        status: result?.status ?? ("not_started" as const)
      };
    });
    const passed = items.filter((item) => ["passed", "waived"].includes(item.status)).length;
    const blockedCount = items.filter((item) => item.status === "blocked" || item.status === "failed").length;
    const prelaunchIncomplete = items.find(
      (item) =>
        item.workflowPhase <= 10 &&
        item.template.blocking &&
        !["passed", "waived"].includes(item.status)
    );
    const operationalIncomplete = items.find(
      (item) =>
        item.workflowPhase >= 11 &&
        item.template.blocking &&
        !["passed", "waived"].includes(item.status)
    );
    const readinessPassed = project?.status === "technical_live_passed";
    const effectivePhaseComplete = new Map<IntegrationWorkflowPhaseIndex, boolean>();
    const phases = integrationWorkflowPhases.map((phase) => {
      const phaseItems = items.filter((item) => item.workflowPhase === phase.index);
      const completedCount = phaseItems.filter((item) => ["passed", "waived"].includes(item.status)).length;
      const incompleteItems = phaseItems.filter(
        (item) => item.template.required && !["passed", "waived"].includes(item.status)
      );
      const blockedItems = incompleteItems.filter(
        (item) => item.status === "blocked" || item.status === "failed"
      );
      const inProgressItems = incompleteItems.filter((item) => item.status === "in_progress");
      const nextItem = blockedItems[0] ?? inProgressItems[0] ?? incompleteItems[0];
      const explicitDueDates = phaseItems
        .map((item) => item.result?.due_date)
        .filter((date): date is string => Boolean(date))
        .sort();
      const plannedDate =
        explicitDueDates[explicitDueDates.length - 1] ??
        integrationPhaseTargetDate(profile?.target_pilot_date, phase.targetOffsetDaysFromPilot);
      const checklistComplete =
        phaseItems.length === 0 ||
        phaseItems
          .filter((item) => item.template.required)
          .every((item) => ["passed", "waived"].includes(item.status));
      const launchApprovalPending = phase.index === 10 && checklistComplete && !readinessPassed;
      const complete = checklistComplete && !launchApprovalPending;
      const incompleteDependencies = phase.dependsOn.filter(
        (dependency) => !effectivePhaseComplete.get(dependency)
      );
      const dependenciesComplete = incompleteDependencies.length === 0;
      const launchGateLocked = phase.index === 11 && !readinessPassed;
      const locked = !dependenciesComplete || launchGateLocked;
      const current = !locked && !complete;
      const today = new Date().toISOString().slice(0, 10);

      effectivePhaseComplete.set(phase.index, complete);

      return {
        ...phase,
        total: phaseItems.length,
        completedCount,
        complete,
        nextItem,
        blocker: blockedItems[0]?.result?.blocker,
        activeOwnerRole: current
          ? nextItem?.template.ownerRole ?? phase.ownerRole
          : phase.ownerRole,
        plannedDate,
        scheduleSource: explicitDueDates.length > 0
          ? ("check_due_date" as const)
          : plannedDate
            ? ("pilot_projection" as const)
            : ("missing" as const),
        overdue: Boolean(plannedDate && !complete && plannedDate < today),
        status: locked ? ("locked" as const) : current ? ("current" as const) : ("complete" as const),
        lockedReason:
          launchGateLocked
            ? "Submit and pass Gate 10 joint production launch approval before pilot traffic."
            : locked
              ? `Complete required gate(s) ${incompleteDependencies
                  .map((dependency) => String(dependency).padStart(2, "0"))
                  .join(", ")} before entering this gate.`
              : undefined
      };
    });
    const currentPhases = phases.filter((phase) => phase.status === "current");
    const nextBlockingItem = readinessPassed ? operationalIncomplete : prelaunchIncomplete;
    const profileValidationIssues = profile ? profileIssues(profileToInput(profile)) : ["Technical profile is not configured."];
    const primaryContact =
      state.publisherContacts.find(
        (contact) => contact.publisher_id === publisherId && contact.is_primary
      ) ?? state.publisherContacts.find((contact) => contact.publisher_id === publisherId);
    const activeAdSlots = state.publisherAdSlots.filter(
      (slot) => slot.publisher_id === publisherId && slot.status === "active"
    );
    const contractTerms = state.publisherContractTerms.filter(
      (term) => term.publisher_id === publisherId
    );
    const packetIssues: EngineeringHandoffIssue[] = [];
    const handoffAccepted = (project?.handoff_status ?? "accepted") === "accepted";

    if (!handoffAccepted) {
      packetIssues.push({
        code: "handoff_acceptance",
        label:
          project?.handoff_status === "submitted"
            ? "The Integration Manager has not accepted the submitted intake package."
            : "The Media Manager has not submitted an accepted intake package.",
        labelZh:
          project?.handoff_status === "submitted"
            ? "媒体接入需求包已提交，等待技术经理接单。"
            : "媒体经理尚未提交可接单的媒体接入需求包。",
        ownerRole: project?.handoff_status === "submitted" ? "integration_manager" : "media_manager",
        blocking: true
      });
    }

    if (!publisher?.legal_entity?.trim()) {
      packetIssues.push({
        code: "publisher_identity",
        label: "Legal entity is not stored on the publisher profile.",
        labelZh: "媒体档案尚未记录签约主体。",
        ownerRole: "media_manager",
        blocking: false
      });
    }
    if (!primaryContact) {
      packetIssues.push({
        code: "primary_contact",
        label: "Primary business contact is missing.",
        labelZh: "缺少媒体侧主要商务联系人。",
        ownerRole: "media_manager",
        blocking: true
      });
    }
    if (activeAdSlots.length === 0) {
      packetIssues.push({
        code: "active_inventory",
        label: "No active inventory or ad placement has been recorded.",
        labelZh: "尚未记录可用广告位或有效库存。",
        ownerRole: "media_manager",
        blocking: true
      });
    }
    if (contractTerms.length === 0) {
      packetIssues.push({
        code: "commercial_terms",
        label: "Commercial and settlement terms are not recorded.",
        labelZh: "尚未记录商业与结算条款。",
        ownerRole: "sales_manager",
        blocking: true
      });
    }
    if (!profile) {
      packetIssues.push({
        code: "technical_profile",
        label: "Approved integration route is not configured.",
        labelZh: "尚未配置已批准的技术接入方案。",
        ownerRole: "integration_manager",
        blocking: true
      });
    } else {
      if (!profile.media_engineering_contact.trim()) {
        packetIssues.push({
          code: "engineering_contact",
          label: "Media engineering contact is missing.",
          labelZh: "缺少媒体侧研发联系人。",
          ownerRole: "media_manager",
          blocking: true
        });
      }
      if (!profile.property_identifier.trim()) {
        packetIssues.push({
          code: "property_identifier",
          label: "Bundle, domain, or property identifier is missing.",
          labelZh: "缺少 Bundle、域名或媒体资产标识。",
          ownerRole: "media_manager",
          blocking: true
        });
      }
      if (!profile.target_pilot_date) {
        packetIssues.push({
          code: "pilot_date",
          label: "Target pilot date is missing.",
          labelZh: "尚未确认目标 Pilot 日期。",
          ownerRole: "integration_manager",
          blocking: true
        });
      }
    }

    const prerequisiteGates = phases
      .filter((phase) => phase.index <= 7)
      .map((phase) => ({
        index: phase.index,
        code: phase.code,
        name: phase.name,
        nameZh: phase.nameZh,
        output: phase.output,
        outputZh: phase.outputZh,
        ownerRole: phase.ownerRole,
        activeOwnerRole: phase.activeOwnerRole,
        completedCount: phase.completedCount,
        total: phase.total,
        complete: phase.complete,
        status: phase.status,
        plannedDate: phase.plannedDate,
        overdue: phase.overdue,
        blocker: phase.blocker,
        nextAction: phase.nextItem
          ? {
              code: phase.nextItem.template.code,
              title: phase.nextItem.template.title,
              titleZh: phase.nextItem.template.titleZh,
              ownerRole: phase.nextItem.template.ownerRole
            }
          : undefined
      }));
    const completedPrerequisiteGates = prerequisiteGates.filter((phase) => phase.complete).length;
    const blockingPacketIssues = packetIssues.filter((issue) => issue.blocking);
    const foundationalGatesComplete = prerequisiteGates
      .filter((phase) => phase.index <= 3)
      .every((phase) => phase.complete);
    const allPrerequisiteGatesComplete = completedPrerequisiteGates === prerequisiteGates.length;
    const engineeringEntryStatus: EngineeringEntryStatus =
      allPrerequisiteGatesComplete && blockingPacketIssues.length === 0
        ? "ready"
        : foundationalGatesComplete
          ? "conditional"
          : "blocked";
    const executionMilestones = phases
      .filter((phase) => phase.index >= 8)
      .map((phase) => ({
        index: phase.index,
        code: phase.code,
        name: phase.name,
        nameZh: phase.nameZh,
        ownerRole: phase.ownerRole,
        completedCount: phase.completedCount,
        total: phase.total,
        complete: phase.complete,
        status: phase.status,
        plannedDate: phase.plannedDate,
        overdue: phase.overdue,
        blocker: phase.blocker
      }));

    return {
      publisher,
      project,
      profile,
      selectedPlaybooks: selectedPlaybooks(profile),
      availablePlaybooks: integrationPlaybooks,
      items,
      passed,
      total: items.length,
      blockedCount,
      profileComplete: profileValidationIssues.length === 0,
      profileValidationIssues,
      recommendedMode: profile
        ? recommendedIntegrationMode(profile.traffic_channel, profile.capability_profile)
        : undefined,
      nextBlockingItem,
      phases,
      currentPhases,
      currentPhase: currentPhases[0] ?? phases[phases.length - 1],
      engineeringHandoff: {
        status: engineeringEntryStatus,
        readyForExecution: engineeringEntryStatus === "ready",
        completedPrerequisiteGates,
        totalPrerequisiteGates: prerequisiteGates.length,
        prerequisiteGates,
        missingPrerequisites: prerequisiteGates.filter((phase) => !phase.complete),
        packetIssues,
        blockingPacketIssues,
        primaryContact,
        activeAdSlots,
        contractTerms,
        executionMilestones
      },
      stageGates: state.mediaOnboardingStageGates.filter(
        (gate) =>
          gate.lifecycle_object_type === "publisher" &&
          gate.lifecycle_object_id === publisherId &&
          ["TECHNICAL_QUALIFICATION", "SDK_INTEGRATION"].includes(gate.stage)
      )
    };
  }

  saveProjectProfile(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: IntegrationProjectProfileInput
  ): SdkIntegrationResult {
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    if (!project) {
      const guard = blocked("Integration project was not found.", "NOT_FOUND");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.profile.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (!rlsService.canWriteTable(user, "integration_project_profiles")) {
      const guard = blocked(
        "Current role cannot update the integration profile.",
        "INTEGRATION_PROFILE_FORBIDDEN",
        "integration_manager"
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.profile.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const issues = profileIssues(input);
    if (issues.length > 0) {
      const guard = blocked(issues.join(" "), "INTEGRATION_PROFILE_INCOMPLETE", "integration_manager");
      const { nextState, auditEvent } = appendEvents(
        state,
        user,
        "integration.profile.update",
        publisherId,
        guard,
        undefined,
        { issueCount: issues.length }
      );
      return { state: nextState, guard, auditEvent };
    }

    const existing = state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id);
    const profile = profileFromInput(project.id, user, input, existing);
    const withProfile: MediaWorkflowState = {
      ...state,
      integrationProjectProfiles: [
        profile,
        ...state.integrationProjectProfiles.filter((item) => item.integration_project_id !== project.id)
      ]
    };
    const nextMissing = incompleteIntegrationChecks(withProfile, project.id, profile)[0];
    const nextState: MediaWorkflowState = {
      ...withProfile,
      integrationProjects: withProfile.integrationProjects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              next_action: nextMissing
                ? `Complete checklist item ${nextMissing.code}: ${nextMissing.title}`
                : "Detailed integration checklist is complete. Record summary evidence."
            }
          : item
      )
    };
    const guard = allowed("Integration profile saved.", "INTEGRATION_PROFILE_UPDATED");
    const event = businessEvent("integration.profile_updated", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      trafficChannel: profile.traffic_channel,
      integrationMode: profile.integration_mode,
      protocolCodes: profile.protocol_codes,
      playbookCodes: profile.playbook_codes,
      plannedFormats: profile.planned_formats
    });
    const appended = appendEvents(
      nextState,
      user,
      "integration.profile.update",
      publisherId,
      guard,
      event,
      { integrationProjectId: project.id, playbookCount: profile.playbook_codes.length }
    );

    return { state: appended.nextState, guard, auditEvent: appended.auditEvent, businessEvent: event };
  }

  updateCheckResult(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: IntegrationCheckUpdateInput
  ): SdkIntegrationResult {
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    const profile = project
      ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
      : undefined;
    if (!project || !profile) {
      const guard = blocked("Save the integration profile before executing the checklist.", "INTEGRATION_PROFILE_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const template = integrationChecklistForProfile(profile).find((item) => item.code === input.itemCode);
    if (!template) {
      const guard = blocked("Checklist item is not part of the selected playbooks.", "INTEGRATION_CHECK_NOT_FOUND");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (
      !rlsService.canWriteTable(user, "integration_check_results") ||
      (!oversightRoles.has(user.activeRole) && user.activeRole !== template.ownerRole)
    ) {
      const guard = blocked(
        "Current role cannot update this checklist item.",
        "INTEGRATION_CHECK_FORBIDDEN",
        template.ownerRole
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    const targetPhase = integrationWorkflowPhaseForCheck(template.code);
    const phaseDefinition = integrationWorkflowPhases.find((phase) => phase.index === targetPhase);
    const engineeringHandoff = this.getWorkspaceSnapshot(state, publisherId).engineeringHandoff;
    if (
      input.status !== "not_started" &&
      targetPhase >= 8 &&
      targetPhase <= 10 &&
      !engineeringHandoff.readyForExecution
    ) {
      const firstGap =
        engineeringHandoff.missingPrerequisites[0]?.nextAction?.title ??
        engineeringHandoff.blockingPacketIssues[0]?.label ??
        "Complete the business-to-engineering handoff.";
      const requiredRole =
        engineeringHandoff.missingPrerequisites[0]?.nextAction?.ownerRole ??
        engineeringHandoff.blockingPacketIssues[0]?.ownerRole ??
        "media_manager";
      const guard = blocked(
        `Engineering execution is locked until Gate 0-7 and the handoff packet are complete. Next: ${firstGap}`,
        "INTEGRATION_ENGINEERING_HANDOFF_REQUIRED",
        requiredRole
      );
      const { nextState, auditEvent } = appendEvents(
        state,
        user,
        "integration.check.update",
        publisherId,
        guard
      );
      return { state: nextState, guard, auditEvent };
    }
    const resultByCode = new Map(
      state.integrationCheckResults
        .filter((result) => result.integration_project_id === project.id)
        .map((result) => [result.item_code, result])
    );
    const dependencyIncomplete = integrationChecklistForProfile(profile).find((item) => {
      const status = resultByCode.get(item.code)?.status ?? "not_started";
      return (
        item.required &&
        phaseDefinition?.dependsOn.includes(integrationWorkflowPhaseForCheck(item.code)) &&
        !["passed", "waived"].includes(status)
      );
    });
    if (input.status !== "not_started" && dependencyIncomplete) {
      const dependencyPhase = integrationWorkflowPhaseForCheck(dependencyIncomplete.code);
      const guard = blocked(
        `Complete dependency Gate ${String(dependencyPhase).padStart(2, "0")} item ${dependencyIncomplete.code} before entering Gate ${String(targetPhase).padStart(2, "0")}.`,
        "INTEGRATION_STAGE_SEQUENCE_BLOCKED",
        dependencyIncomplete.ownerRole
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (
      input.status !== "not_started" &&
      targetPhase === 11 &&
      project.status !== "technical_live_passed"
    ) {
      const guard = blocked(
        "Pass and formally submit Gate 10 joint production launch approval before starting pilot traffic.",
        "INTEGRATION_LAUNCH_GATE_REQUIRED",
        "media_director"
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (input.status === "passed" && template.blocking && !input.evidenceReference?.trim()) {
      const guard = blocked("Blocking checklist items require evidence before passing.", "INTEGRATION_CHECK_EVIDENCE_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (["blocked", "failed"].includes(input.status) && !input.blocker?.trim()) {
      const guard = blocked("Blocked or failed checklist items require a concrete reason.", "INTEGRATION_CHECK_BLOCKER_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (input.status === "waived" && !input.waiverReason?.trim()) {
      const guard = blocked("Waived checklist items require an approved reason.", "INTEGRATION_CHECK_WAIVER_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const existing = state.integrationCheckResults.find(
      (item) => item.integration_project_id === project.id && item.item_code === template.code
    );
    const now = new Date().toISOString();
    const result: IntegrationCheckResult = {
      id: existing?.id ?? crypto.randomUUID(),
      integration_project_id: project.id,
      item_code: template.code,
      status: input.status,
      owner_role: template.ownerRole,
      responsible_party: template.responsibleParty,
      due_date: input.dueDate || existing?.due_date,
      evidence_reference: input.evidenceReference?.trim() || existing?.evidence_reference,
      blocker: input.blocker?.trim() || undefined,
      waiver_reason: input.waiverReason?.trim() || undefined,
      updated_by: user.id,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    const withResult: MediaWorkflowState = {
      ...state,
      integrationCheckResults: [
        result,
        ...state.integrationCheckResults.filter(
          (item) => !(item.integration_project_id === project.id && item.item_code === template.code)
        )
      ]
    };
    const remainingPrelaunch = incompleteIntegrationChecks(withResult, project.id, profile);
    const remainingOperational = integrationChecklistForProfile(profile).filter((item) => {
      const status = withResult.integrationCheckResults.find(
        (resultItem) =>
          resultItem.integration_project_id === project.id &&
          resultItem.item_code === item.code
      )?.status ?? "not_started";
      return (
        integrationWorkflowPhaseForCheck(item.code) >= 11 &&
        item.blocking &&
        !["passed", "waived"].includes(status)
      );
    });
    const remaining = project.status === "technical_live_passed"
      ? remainingOperational
      : remainingPrelaunch;
    const blockedResults = withResult.integrationCheckResults.filter(
      (item) => item.integration_project_id === project.id && ["blocked", "failed"].includes(item.status)
    );
    const nextState: MediaWorkflowState = {
      ...withResult,
      integrationProjects: withResult.integrationProjects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              status: blockedResults.length > 0 ? "technical_blocked" : item.status === "technical_blocked" ? "in_integration" : item.status,
              blocker:
                blockedResults.length > 0
                  ? `[${blockedResults[0].item_code}] ${blockedResults[0].blocker ?? "Checklist item blocked"}`
                  : item.blocker?.startsWith("[")
                    ? undefined
                    : item.blocker,
              next_action: remaining[0]
                ? `Complete checklist item ${remaining[0].code}: ${remaining[0].title}`
                : project.status === "technical_live_passed"
                  ? "Pilot and scale governance checklist is complete."
                  : "Gate 0-10 checklist is complete. Submit joint production launch approval."
            }
          : item
      )
    };
    const guard = allowed("Integration checklist item updated.", "INTEGRATION_CHECK_UPDATED");
    const event = businessEvent("integration.check_updated", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      itemCode: template.code,
      workflowPhase: targetPhase,
      status: result.status
    });
    const appended = appendEvents(
      nextState,
      user,
      "integration.check.update",
      publisherId,
      guard,
      event,
      {
        integrationProjectId: project.id,
        itemCode: template.code,
        workflowPhase: targetPhase,
        status: result.status
      }
    );

    return { state: appended.nextState, guard, auditEvent: appended.auditEvent, businessEvent: event };
  }

  canManageProfile(user: BusinessUser) {
    return rlsService.canWriteTable(user, "integration_project_profiles");
  }

  canManageCheck(user: BusinessUser, ownerRole: RoleCode) {
    return (
      rlsService.canWriteTable(user, "integration_check_results") &&
      (oversightRoles.has(user.activeRole) || user.activeRole === ownerRole)
    );
  }

  canManageExecution(user: BusinessUser) {
    return (
      rlsService.canWriteTable(user, "integration_projects") &&
      rbacService.hasCapability(user, "integration.manage")
    );
  }

  canSubmitReadiness(user: BusinessUser) {
    return rbacService.hasAnyRole(user, ["media_director", "operations_director"]);
  }

  hasIntegrationCapability(user: BusinessUser) {
    return rbacService.hasCapability(user, "integration.manage");
  }
}

export const sdkIntegrationService = new SdkIntegrationService();
