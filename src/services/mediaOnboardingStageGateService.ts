import type { RoleCode } from "../constants/roles";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  MediaOnboardingGateDeliverable,
  MediaOnboardingGateKpiEvidence,
  MediaOnboardingStage,
  MediaOnboardingStageGate,
  MediaWorkflowState,
  ModuleBusinessEvent
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";

export type MediaOnboardingStageGateTarget = {
  objectType: MediaOnboardingStageGate["lifecycle_object_type"];
  objectId: EntityId;
  stage: MediaOnboardingStage;
};

export type MediaOnboardingStageGateDefinition = {
  stage: MediaOnboardingStage;
  ownerRoles: RoleCode[];
  approvalRoles: RoleCode[];
  deliverables: Array<
    Pick<MediaOnboardingGateDeliverable, "code" | "title" | "required"> & { titleZh: string }
  >;
  kpis: Array<
    Pick<MediaOnboardingGateKpiEvidence, "code" | "label" | "required" | "unit"> & { labelZh: string }
  >;
};

export type MediaOnboardingStageGateUpdate = {
  ownerRole: RoleCode;
  targetDate?: string;
  deliverables: MediaOnboardingGateDeliverable[];
  kpiEvidence: MediaOnboardingGateKpiEvidence[];
  blocker?: string;
  notes?: string;
};

export type MediaOnboardingStageGateResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  gate?: MediaOnboardingStageGate;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

const elevatedManagerRoles: RoleCode[] = ["media_director", "operations_director"];

export const mediaOnboardingStageGateDefinitions: Record<MediaOnboardingStage, MediaOnboardingStageGateDefinition> = {
  MEDIA_DISCOVERY: {
    stage: "MEDIA_DISCOVERY",
    ownerRoles: ["media_manager", "media_director"],
    approvalRoles: ["media_director", "operations_director"],
    deliverables: [
      { code: "media_profile", title: "Media profile and source verified", titleZh: "媒体画像与线索来源已核验", required: true },
      { code: "accountable_owner", title: "Accountable owner and next outreach assigned", titleZh: "已分配负责人和下一次外联动作", required: true },
      { code: "priority_assessment", title: "Priority assessment completed", titleZh: "已完成媒体优先级评估", required: true }
    ],
    kpis: [{ code: "priority_score", label: "Priority score", labelZh: "优先级评分", required: true, unit: "/100" }]
  },
  BUSINESS_QUALIFICATION: {
    stage: "BUSINESS_QUALIFICATION",
    ownerRoles: ["media_manager", "media_director"],
    approvalRoles: ["media_director", "operations_director"],
    deliverables: [
      { code: "assessment_report", title: "Media assessment report", titleZh: "媒体评估报告已完成", required: true },
      { code: "contact_confirmed", title: "Business contact and interest confirmed", titleZh: "商务联系人与合作意向已确认", required: true },
      { code: "inventory_identified", title: "Monetizable ad inventory identified", titleZh: "可商业化广告库存已识别", required: true }
    ],
    kpis: [
      { code: "qualified_inventory", label: "Qualified inventory", labelZh: "合格库存量", required: true, unit: "requests/day" },
      { code: "commercial_fit", label: "Commercial fit score", labelZh: "商务匹配评分", required: true, unit: "/100" }
    ]
  },
  COMMERCIAL_AGREEMENT: {
    stage: "COMMERCIAL_AGREEMENT",
    ownerRoles: ["legal_manager", "media_manager", "media_director"],
    approvalRoles: ["legal_manager", "media_director", "operations_director"],
    deliverables: [
      { code: "agreement_scope", title: "NDA / MSA / SOW / DPA scope confirmed", titleZh: "NDA / MSA / SOW / DPA 合同范围已确认", required: true },
      { code: "commercial_terms", title: "Commercial and settlement terms approved", titleZh: "商务与结算条款已批准", required: true },
      { code: "signed_agreement", title: "Signed agreement linked", titleZh: "已关联签署完成的合同", required: true }
    ],
    kpis: [{ code: "revenue_share", label: "Revenue share", labelZh: "媒体分成比例", required: true, unit: "%" }]
  },
  TECHNICAL_QUALIFICATION: {
    stage: "TECHNICAL_QUALIFICATION",
    ownerRoles: ["integration_manager", "media_manager", "media_director"],
    approvalRoles: ["integration_manager", "media_director", "operations_director"],
    deliverables: [
      { code: "technical_checklist", title: "Technical qualification checklist", titleZh: "技术资格检查清单已完成", required: true },
      { code: "privacy_ivt", title: "Privacy, consent, and IVT controls reviewed", titleZh: "隐私、授权和 IVT 控制已审核", required: true },
      { code: "integration_plan", title: "SDK or endpoint integration plan", titleZh: "SDK 或接口接入方案已确认", required: true }
    ],
    kpis: [
      { code: "estimated_qps", label: "Estimated request volume", labelZh: "预计请求量", required: true, unit: "QPS" },
      { code: "max_ivt_rate", label: "Maximum accepted IVT", labelZh: "最大可接受 IVT", required: true, unit: "%" }
    ]
  },
  SDK_INTEGRATION: {
    stage: "SDK_INTEGRATION",
    ownerRoles: ["integration_manager", "media_director"],
    approvalRoles: ["integration_manager", "media_director", "operations_director"],
    deliverables: [
      { code: "test_build", title: "SDK build or endpoint configuration received", titleZh: "已收到 SDK 测试包或接口配置", required: true },
      { code: "request_callback", title: "Request and callback evidence verified", titleZh: "请求与回调证据已核验", required: true },
      { code: "production_logs", title: "Production-like logs reviewed", titleZh: "类生产环境日志已审核", required: true }
    ],
    kpis: [{ code: "request_success_rate", label: "Request success rate", labelZh: "请求成功率", required: true, unit: "%" }]
  },
  QA_CERTIFICATION: {
    stage: "QA_CERTIFICATION",
    ownerRoles: ["integration_manager", "data_analyst", "media_director"],
    approvalRoles: ["integration_manager", "media_director", "operations_director"],
    deliverables: [
      { code: "certification_report", title: "Certification report completed", titleZh: "认证报告已完成", required: true },
      { code: "critical_issues", title: "Critical issues closed", titleZh: "关键问题已关闭", required: true },
      { code: "pilot_release", title: "Pilot release recommendation recorded", titleZh: "已记录 Pilot 放行建议", required: true }
    ],
    kpis: [
      { code: "qa_pass_rate", label: "QA pass rate", labelZh: "QA 通过率", required: true, unit: "%" },
      { code: "observed_ivt", label: "Observed IVT", labelZh: "观测 IVT", required: true, unit: "%" }
    ]
  },
  PILOT: {
    stage: "PILOT",
    ownerRoles: ["adops_manager", "media_manager", "media_director"],
    approvalRoles: ["media_director", "operations_director"],
    deliverables: [
      { code: "pilot_plan", title: "Controlled Pilot plan approved", titleZh: "受控 Pilot 方案已批准", required: true },
      { code: "pilot_report", title: "Pilot report and recommendation completed", titleZh: "Pilot 报告与结论已完成", required: true }
    ],
    kpis: [
      { code: "fill_rate", label: "Fill rate", labelZh: "填充率", required: true, unit: "%" },
      { code: "clear_rate", label: "Clear rate", labelZh: "清算率", required: true, unit: "%" },
      { code: "ivt_rate", label: "IVT rate", labelZh: "IVT 比例", required: true, unit: "%" },
      { code: "pilot_spend", label: "Pilot spend", labelZh: "Pilot 消耗", required: true, unit: "CNY" }
    ]
  },
  PRODUCTION_LAUNCH: {
    stage: "PRODUCTION_LAUNCH",
    ownerRoles: ["media_director", "adops_manager"],
    approvalRoles: ["media_director", "operations_director"],
    deliverables: [
      { code: "launch_approval", title: "Production launch approval", titleZh: "正式上线审批已完成", required: true },
      { code: "supply_package", title: "Controlled supply package activated", titleZh: "受控供给包已激活", required: true },
      { code: "monitoring_plan", title: "Quality and revenue monitoring plan", titleZh: "质量与收入监控方案已建立", required: true }
    ],
    kpis: [{ code: "launch_inventory", label: "Approved launch inventory", labelZh: "批准上线的库存量", required: true, unit: "requests/day" }]
  },
  SCALE_OPERATION: {
    stage: "SCALE_OPERATION",
    ownerRoles: ["media_director", "operations_director"],
    approvalRoles: ["media_director", "operations_director"],
    deliverables: [
      { code: "scale_plan", title: "Scale growth plan", titleZh: "规模增长方案已制定", required: true },
      { code: "operating_review", title: "Recurring operating review established", titleZh: "周期性运营复盘机制已建立", required: true }
    ],
    kpis: [
      { code: "revenue_growth", label: "Revenue growth", labelZh: "收入增长率", required: true, unit: "%" },
      { code: "scale_ivt", label: "Scale IVT rate", labelZh: "规模化 IVT 比例", required: true, unit: "%" }
    ]
  }
};

function allowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function blocked(message: string, reasonCode: string, requiredApprovalRole?: string): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

function canManage(user: BusinessUser, stage: MediaOnboardingStage) {
  const roles = [...mediaOnboardingStageGateDefinitions[stage].ownerRoles, ...elevatedManagerRoles];
  return roles.includes(user.activeRole);
}

function canApprove(user: BusinessUser, stage: MediaOnboardingStage) {
  return mediaOnboardingStageGateDefinitions[stage].approvalRoles.includes(user.activeRole);
}

function createBusinessEvent(
  eventCode: string,
  gate: MediaOnboardingStageGate,
  user: BusinessUser,
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType: "media_onboarding_stage_gate",
    objectId: gate.id,
    ownerRole: user.activeRole,
    createdAt: new Date().toISOString(),
    payload: {
      lifecycleObjectType: gate.lifecycle_object_type,
      lifecycleObjectId: gate.lifecycle_object_id,
      stage: gate.stage,
      status: gate.status,
      ...payload
    }
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
) {
  const auditEvent = auditService.createGuardAuditEvent(
    user,
    action,
    "media_onboarding_stage_gate",
    guard,
    objectId
  );
  const nextState: MediaWorkflowState = {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };

  return { state: nextState, auditEvent, businessEvent };
}

function withGate(state: MediaWorkflowState, gate: MediaOnboardingStageGate) {
  const exists = state.mediaOnboardingStageGates.some((item) => item.id === gate.id);
  return {
    ...state,
    mediaOnboardingStageGates: exists
      ? state.mediaOnboardingStageGates.map((item) => (item.id === gate.id ? gate : item))
      : [gate, ...state.mediaOnboardingStageGates]
  };
}

function gateById(state: MediaWorkflowState, gateId: EntityId) {
  return state.mediaOnboardingStageGates.find((gate) => gate.id === gateId);
}

function gateForTarget(state: MediaWorkflowState, target: MediaOnboardingStageGateTarget) {
  return state.mediaOnboardingStageGates.find(
    (gate) =>
      gate.lifecycle_object_type === target.objectType &&
      gate.lifecycle_object_id === target.objectId &&
      gate.stage === target.stage
  );
}

function buildDeliverables(stage: MediaOnboardingStage): MediaOnboardingGateDeliverable[] {
  return mediaOnboardingStageGateDefinitions[stage].deliverables.map(({ code, title, required }) => ({
    code,
    title,
    required,
    completed: false
  }));
}

function buildKpis(stage: MediaOnboardingStage): MediaOnboardingGateKpiEvidence[] {
  return mediaOnboardingStageGateDefinitions[stage].kpis.map(({ code, label, required, unit }) => ({
    code,
    label,
    required,
    unit
  }));
}

function resultWithDeniedAudit(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId,
  guard: GuardResult
): MediaOnboardingStageGateResult {
  const eventState = appendEvents(state, user, action, objectId, guard);
  return { ...eventState, guard };
}

export const mediaOnboardingStageGateService = {
  getGate(state: MediaWorkflowState, target: MediaOnboardingStageGateTarget) {
    return gateForTarget(state, target);
  },

  canManage(user: BusinessUser, stage: MediaOnboardingStage) {
    return canManage(user, stage);
  },

  canApprove(user: BusinessUser, stage: MediaOnboardingStage) {
    return canApprove(user, stage);
  },

  startGate(
    state: MediaWorkflowState,
    user: BusinessUser,
    target: MediaOnboardingStageGateTarget
  ): MediaOnboardingStageGateResult {
    const existing = gateForTarget(state, target);
    if (existing) {
      return { state, gate: existing, guard: allowed("Stage gate is already available.", "MEDIA_ONBOARDING_GATE_EXISTS") };
    }
    if (!canManage(user, target.stage)) {
      const guard = blocked(
        "Current role cannot start this lifecycle stage gate.",
        "MEDIA_ONBOARDING_GATE_START_FORBIDDEN",
        mediaOnboardingStageGateDefinitions[target.stage].ownerRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.start", target.objectId, guard);
    }

    const now = new Date().toISOString();
    const definition = mediaOnboardingStageGateDefinitions[target.stage];
    const ownerRole = definition.ownerRoles.includes(user.activeRole) ? user.activeRole : definition.ownerRoles[0];
    const gate: MediaOnboardingStageGate = {
      id: crypto.randomUUID(),
      lifecycle_object_type: target.objectType,
      lifecycle_object_id: target.objectId,
      stage: target.stage,
      status: "in_progress",
      owner_user_id: user.id,
      owner_role: ownerRole,
      deliverables: buildDeliverables(target.stage),
      kpi_evidence: buildKpis(target.stage),
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now
    };
    const guard = allowed("Lifecycle stage gate started.", "MEDIA_ONBOARDING_GATE_STARTED");
    const businessEvent = createBusinessEvent("media_onboarding.stage_gate_started", gate, user);
    const eventState = appendEvents(withGate(state, gate), user, "media_onboarding.stage_gate.start", gate.id, guard, businessEvent);
    return { ...eventState, gate, guard };
  },

  updateGate(
    state: MediaWorkflowState,
    user: BusinessUser,
    gateId: EntityId,
    input: MediaOnboardingStageGateUpdate
  ): MediaOnboardingStageGateResult {
    const current = gateById(state, gateId);
    if (!current) {
      const guard = blocked("Lifecycle stage gate was not found.", "MEDIA_ONBOARDING_GATE_NOT_FOUND");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.update", gateId, guard);
    }
    if (!canManage(user, current.stage)) {
      const guard = blocked(
        "Current role cannot update this lifecycle stage gate.",
        "MEDIA_ONBOARDING_GATE_UPDATE_FORBIDDEN",
        mediaOnboardingStageGateDefinitions[current.stage].ownerRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.update", gateId, guard);
    }
    if (current.status === "approved") {
      const guard = blocked("Approved stage gates are immutable.", "MEDIA_ONBOARDING_GATE_ALREADY_APPROVED");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.update", gateId, guard);
    }
    const definition = mediaOnboardingStageGateDefinitions[current.stage];
    if (!definition.ownerRoles.includes(input.ownerRole)) {
      const guard = blocked(
        "Selected owner role is not valid for this lifecycle stage.",
        "MEDIA_ONBOARDING_GATE_OWNER_INVALID",
        definition.ownerRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.update", gateId, guard);
    }

    const now = new Date().toISOString();
    const blockerText = input.blocker?.trim() || undefined;
    const gate: MediaOnboardingStageGate = {
      ...current,
      owner_role: input.ownerRole,
      owner_user_id: user.activeRole === input.ownerRole ? user.id : current.owner_user_id,
      target_date: input.targetDate || undefined,
      deliverables: input.deliverables,
      kpi_evidence: input.kpiEvidence,
      blocker: blockerText,
      notes: input.notes?.trim() || undefined,
      status: blockerText ? "blocked" : "in_progress",
      submitted_at: undefined,
      updated_by: user.id,
      updated_at: now
    };
    const guard = allowed("Lifecycle stage gate updated.", "MEDIA_ONBOARDING_GATE_UPDATED");
    const businessEvent = createBusinessEvent("media_onboarding.stage_gate_updated", gate, user, {
      completedDeliverables: gate.deliverables.filter((item) => item.completed).length,
      totalDeliverables: gate.deliverables.length
    });
    const eventState = appendEvents(withGate(state, gate), user, "media_onboarding.stage_gate.update", gate.id, guard, businessEvent);
    return { ...eventState, gate, guard };
  },

  requestApproval(
    state: MediaWorkflowState,
    user: BusinessUser,
    gateId: EntityId
  ): MediaOnboardingStageGateResult {
    const current = gateById(state, gateId);
    if (!current) {
      const guard = blocked("Lifecycle stage gate was not found.", "MEDIA_ONBOARDING_GATE_NOT_FOUND");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.submit", gateId, guard);
    }
    if (!canManage(user, current.stage)) {
      const guard = blocked(
        "Current role cannot submit this lifecycle stage gate.",
        "MEDIA_ONBOARDING_GATE_SUBMIT_FORBIDDEN",
        mediaOnboardingStageGateDefinitions[current.stage].ownerRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.submit", gateId, guard);
    }

    const missingDeliverables = current.deliverables.filter(
      (item) => item.required && (!item.completed || !item.evidence?.trim())
    );
    const missingKpis = current.kpi_evidence.filter((item) => item.required && !item.value?.trim());
    const blockerReason = current.blocker?.trim();
    const missingPlanning = !current.owner_role || !current.target_date;
    if (missingDeliverables.length > 0 || missingKpis.length > 0 || blockerReason || missingPlanning) {
      const guard = blocked(
        "Complete required deliverables, KPI evidence, owner, target date, and clear blockers before submission.",
        "MEDIA_ONBOARDING_GATE_INCOMPLETE"
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.submit", gateId, guard);
    }

    const now = new Date().toISOString();
    const gate: MediaOnboardingStageGate = {
      ...current,
      status: "ready_for_approval",
      submitted_at: now,
      updated_by: user.id,
      updated_at: now
    };
    const guard = allowed("Lifecycle stage gate submitted for approval.", "MEDIA_ONBOARDING_GATE_SUBMITTED");
    const businessEvent = createBusinessEvent("media_onboarding.stage_gate_submitted", gate, user);
    const eventState = appendEvents(withGate(state, gate), user, "media_onboarding.stage_gate.submit", gate.id, guard, businessEvent);
    return { ...eventState, gate, guard };
  },

  approveGate(state: MediaWorkflowState, user: BusinessUser, gateId: EntityId): MediaOnboardingStageGateResult {
    const current = gateById(state, gateId);
    if (!current) {
      const guard = blocked("Lifecycle stage gate was not found.", "MEDIA_ONBOARDING_GATE_NOT_FOUND");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.approve", gateId, guard);
    }
    if (!canApprove(user, current.stage)) {
      const guard = blocked(
        "Current role cannot approve this lifecycle stage gate.",
        "MEDIA_ONBOARDING_GATE_APPROVE_FORBIDDEN",
        mediaOnboardingStageGateDefinitions[current.stage].approvalRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.approve", gateId, guard);
    }
    if (current.status !== "ready_for_approval") {
      const guard = blocked(
        "Stage gate must be submitted before approval.",
        "MEDIA_ONBOARDING_GATE_NOT_SUBMITTED"
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.approve", gateId, guard);
    }

    const now = new Date().toISOString();
    const gate: MediaOnboardingStageGate = {
      ...current,
      status: "approved",
      approved_by: user.id,
      approved_by_role: user.activeRole,
      approved_at: now,
      updated_by: user.id,
      updated_at: now
    };
    const guard = allowed("Lifecycle stage gate approved.", "MEDIA_ONBOARDING_GATE_APPROVED");
    const businessEvent = createBusinessEvent("media_onboarding.stage_gate_approved", gate, user);
    const eventState = appendEvents(withGate(state, gate), user, "media_onboarding.stage_gate.approve", gate.id, guard, businessEvent);
    return { ...eventState, gate, guard };
  },

  rejectGate(
    state: MediaWorkflowState,
    user: BusinessUser,
    gateId: EntityId,
    reason: string
  ): MediaOnboardingStageGateResult {
    const current = gateById(state, gateId);
    if (!current) {
      const guard = blocked("Lifecycle stage gate was not found.", "MEDIA_ONBOARDING_GATE_NOT_FOUND");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.reject", gateId, guard);
    }
    if (!canApprove(user, current.stage)) {
      const guard = blocked(
        "Current role cannot reject this lifecycle stage gate.",
        "MEDIA_ONBOARDING_GATE_REJECT_FORBIDDEN",
        mediaOnboardingStageGateDefinitions[current.stage].approvalRoles[0]
      );
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.reject", gateId, guard);
    }
    if (!reason.trim()) {
      const guard = blocked("A rejection reason is required.", "MEDIA_ONBOARDING_GATE_REJECTION_REASON_REQUIRED");
      return resultWithDeniedAudit(state, user, "media_onboarding.stage_gate.reject", gateId, guard);
    }

    const gate: MediaOnboardingStageGate = {
      ...current,
      status: "rejected",
      blocker: reason.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    const guard = allowed("Lifecycle stage gate rejected.", "MEDIA_ONBOARDING_GATE_REJECTED");
    const businessEvent = createBusinessEvent("media_onboarding.stage_gate_rejected", gate, user, {
      reason: reason.trim()
    });
    const eventState = appendEvents(withGate(state, gate), user, "media_onboarding.stage_gate.reject", gate.id, guard, businessEvent);
    return { ...eventState, gate, guard };
  }
};
