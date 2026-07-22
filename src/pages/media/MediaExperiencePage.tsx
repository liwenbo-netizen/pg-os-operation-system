import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Handshake,
  History,
  LayoutList,
  Map,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TestTube2,
  TrendingUp,
  type LucideIcon,
  UserCheck,
  Wrench
} from "lucide-react";
import { GuidedEmptyState, MetricStrip, NextActionBar, OperatingPageHeader } from "../../components/OperatingPage";
import { BusinessStagePath } from "../../components/BusinessStagePath";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import {
  chinaMediaEcosystemService,
  mediaEcosystemBatchOperationLimit,
  mediaEcosystemTrackLabels,
  type MediaEcosystemOperationalQueueKey,
  type OnboardingHandoffSnapshot
} from "../../services/chinaMediaEcosystemService";
import {
  integrationEvidenceDefinitions,
  mediaWorkflowService,
  type PublisherOnboardingInput
} from "../../services/mediaWorkflowService";
import { trustedSupplyNetworkService } from "../../services/trustedSupplyNetworkService";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  IntegrationEvidenceType,
  MediaEcosystemLead,
  MediaEcosystemPriorityScore,
  MediaEcosystemTrack,
  MediaExpansionStage,
  MediaWorkflowState,
  Publisher,
  TrustedSupplyCandidate
} from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import {
  getEcosystemBlockerLabel,
  getEcosystemCandidateStatusLabel,
  getEcosystemDataQualityLabel,
  getEcosystemGapCopy,
  getEcosystemPrimaryAction,
  getEcosystemQueueCopy,
  getEcosystemStageLabel,
  getEcosystemTrackLabel,
  getEcosystemVerificationLabel,
  type EcosystemPrimaryAction,
  type EcosystemWorkspaceView
} from "./mediaEcosystemPageModel";
import {
  getPublisherPrimaryAction,
  getPublisherReadinessSteps,
  getPublisherRiskLabel,
  getPublisherStatusLabel,
  type PublisherPrimaryAction,
  type PublisherReadinessState,
  type PublisherWorkspaceView
} from "./publisherReadinessPageModel";
import {
  getMediaDirectorDecision,
  getMediaDirectorReadinessSteps,
  type MediaDirectorApprovalTarget
} from "./mediaDirectorCommandCenterModel";
import { PublisherOnboardingWizard } from "./PublisherOnboardingWizard";
import {
  createPublisherOnboardingDraftFromSnapshot,
  type PublisherOnboardingDraft
} from "./publisherOnboardingModel";
import {
  filterAndSortPublisherQueue,
  publisherQueueStatusOptions,
  type PublisherQueueSort,
  type PublisherQueueStatusFilter
} from "./publisherQueueModel";
import { formatUtcPlus8Date } from "../../lib/time";

type MediaExperiencePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: MediaWorkflowState;
  selectedObjectId?: EntityId;
  onStateChange: (state: MediaWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
  onRouteChange: (path: string, objectId?: EntityId) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

type MediaActionResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  auditEvents?: AuditEvent[];
  publisherId?: EntityId;
};

const statusTone = {
  draft: "neutral",
  pending_integration: "warning",
  in_integration: "warning",
  technical_review: "warning",
  technical_live_passed: "success",
  technical_blocked: "danger",
  deprecated: "neutral",
  not_started: "neutral",
  ready_for_test: "info",
  testing: "warning",
  test_passed: "success",
  test_failed: "danger",
  not_allowed: "danger",
  limited_sellable: "warning",
  proposal_selectable: "info",
  scale_ready: "success",
  scale_blocked: "danger",
  paused: "neutral"
} as const;

function toneForStatus(status: keyof typeof statusTone) {
  return statusTone[status] ?? "neutral";
}

function toneForExpansionStage(stage: MediaExpansionStage) {
  if (stage === "REJECTED") {
    return "danger" as const;
  }

  if (stage === "ON_HOLD") {
    return "warning" as const;
  }

  if (stage === "TRUSTED_SUPPLY_CANDIDATE" || stage === "ONBOARDING_PROJECT_CREATED") {
    return "success" as const;
  }

  if (["CONTACTED", "MEETING_SCHEDULED", "BUSINESS_QUALIFIED", "TECH_FEASIBILITY_CHECK"].includes(stage)) {
    return "info" as const;
  }

  return "neutral" as const;
}

function toneForCandidateStatus(status: TrustedSupplyCandidate["status"]) {
  if (status === "rejected") {
    return "danger" as const;
  }

  if (status === "onboarding_project_created" || status === "onboarding_ready") {
    return "success" as const;
  }

  if (status === "readiness_started" || status === "technical_review_passed") {
    return "warning" as const;
  }

  return "info" as const;
}

const ecosystemStageOptions: Array<"ALL" | MediaExpansionStage> = [
  "ALL",
  "ECOSYSTEM_MAPPED",
  "PRIORITY_SCREENED",
  "OUTREACH_READY",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "BUSINESS_QUALIFIED",
  "TECH_FEASIBILITY_CHECK",
  "TRUSTED_SUPPLY_CANDIDATE",
  "ONBOARDING_PROJECT_CREATED",
  "ON_HOLD",
  "REJECTED"
];

const ecosystemPriorityOptions = ["ALL", "HIGH", "WATCH", "UNSCORED"] as const;

type EcosystemPriorityFilter = (typeof ecosystemPriorityOptions)[number];

const ecosystemOwnerOptions = [
  "ALL",
  "NO_USER_OWNER",
  "MINE",
  "MEDIA_MANAGER_ROLE",
  "MEDIA_DIRECTOR_ROLE",
  "OPERATIONS_DIRECTOR_ROLE"
] as const;

type EcosystemOwnerFilter = (typeof ecosystemOwnerOptions)[number];

const ecosystemReviewOptions = ["ALL", "REVIEW_REQUIRED", "SEED_ONLY", "MANUAL_REVIEWED", "UNVERIFIED", "VERIFIED"] as const;

type EcosystemReviewFilter = (typeof ecosystemReviewOptions)[number];

const ecosystemListPageSize = 24;

function matchesEcosystemPriority(lead: MediaEcosystemLead, filter: EcosystemPriorityFilter) {
  if (filter === "HIGH") {
    return lead.priority_score >= 70;
  }

  if (filter === "WATCH") {
    return lead.priority_score > 0 && lead.priority_score < 70;
  }

  if (filter === "UNSCORED") {
    return lead.priority_score === 0;
  }

  return true;
}

function matchesEcosystemOwner(lead: MediaEcosystemLead, filter: EcosystemOwnerFilter, user: BusinessUser) {
  if (filter === "NO_USER_OWNER") {
    return !lead.owner_user_id;
  }

  if (filter === "MINE") {
    return lead.owner_user_id === user.id;
  }

  if (filter === "MEDIA_MANAGER_ROLE") {
    return lead.owner_role === "media_manager";
  }

  if (filter === "MEDIA_DIRECTOR_ROLE") {
    return lead.owner_role === "media_director";
  }

  if (filter === "OPERATIONS_DIRECTOR_ROLE") {
    return lead.owner_role === "operations_director";
  }

  return true;
}

function matchesEcosystemReview(lead: MediaEcosystemLead, filter: EcosystemReviewFilter) {
  if (filter === "REVIEW_REQUIRED") {
    return lead.review_required;
  }

  if (filter === "SEED_ONLY") {
    return lead.data_quality_level === "SEED_ONLY";
  }

  if (filter === "MANUAL_REVIEWED") {
    return lead.data_quality_level === "MANUAL_REVIEWED";
  }

  if (filter === "UNVERIFIED") {
    return lead.verification_status === "UNVERIFIED";
  }

  if (filter === "VERIFIED") {
    return lead.verification_status === "VERIFIED";
  }

  return true;
}

export function MediaExperiencePage({
  route,
  role,
  user,
  state,
  selectedObjectId,
  onStateChange,
  onAuditEvent,
  onRouteChange
}: MediaExperiencePageProps) {
  const { locale, t } = useLocale();
  const [selectedPublisherId, setSelectedPublisherId] = useState<EntityId>("publisher-new-ctv");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [publisherOnboardingOpen, setPublisherOnboardingOpen] = useState(false);
  const [publisherEditorOpen, setPublisherEditorOpen] = useState(false);
  const [publisherEditorDraft, setPublisherEditorDraft] = useState<PublisherOnboardingDraft>();

  const summary = mediaWorkflowService.getSummary(state);
  const ecosystemSummary = chinaMediaEcosystemService.getSummary(state);
  const queue = mediaWorkflowService.getReadinessQueue(state);
  const selectedPublisher = state.publishers.find((publisher) => publisher.id === selectedPublisherId) ?? state.publishers[0];
  const selectedSnapshot = selectedPublisher
    ? mediaWorkflowService.getPublisherSnapshot(state, selectedPublisher.id)
    : undefined;

  useEffect(() => {
    if (selectedObjectId && state.publishers.some((publisher) => publisher.id === selectedObjectId)) {
      setSelectedPublisherId(selectedObjectId);
    }
  }, [selectedObjectId, state.publishers]);

  function runAction(title: string, action: () => MediaActionResult) {
    const result = action();
    onStateChange(result.state);
    const auditEvents = result.auditEvents ?? (result.auditEvent ? [result.auditEvent] : []);
    auditEvents.forEach(onAuditEvent);
    setMessage({ title, guard: result.guard });
  }

  function onboardingSubmitMessage(guard: GuardResult) {
    if (guard.reason_code === "PUBLISHER_NAME_DUPLICATE") return t("media.duplicateName");
    if (guard.reason_code === "PUBLISHER_IDENTIFIER_DUPLICATE") return t("media.duplicateIdentifier");
    return guard.message;
  }

  function submitPublisherOnboarding(input: PublisherOnboardingInput) {
    const result = mediaWorkflowService.createPublisherOnboarding(state, user, input);
    onStateChange(result.state);
    const auditEvents = result.auditEvents ?? (result.auditEvent ? [result.auditEvent] : []);
    auditEvents.forEach(onAuditEvent);
    setMessage({ title: t("media.onboardingTitle"), guard: result.guard });

    if (result.guard.allowed && result.publisherId) {
      setSelectedPublisherId(result.publisherId);
      onRouteChange("/media/publishers/:id", result.publisherId);
    }

    return { allowed: result.guard.allowed, message: onboardingSubmitMessage(result.guard) };
  }

  function openPublisherEditor() {
    if (!selectedSnapshot?.publisher) return;
    setPublisherEditorDraft(createPublisherOnboardingDraftFromSnapshot(selectedSnapshot));
    setPublisherEditorOpen(true);
  }

  function submitPublisherUpdate(input: PublisherOnboardingInput) {
    if (!selectedSnapshot?.publisher) {
      return { allowed: false, message: t("media.publisherNotFound") };
    }

    const result = mediaWorkflowService.updatePublisherOnboarding(
      state,
      user,
      selectedSnapshot.publisher.id,
      input
    );
    onStateChange(result.state);
    const auditEvents = result.auditEvents ?? (result.auditEvent ? [result.auditEvent] : []);
    auditEvents.forEach(onAuditEvent);
    setMessage({ title: t("media.onboardingEditTitle"), guard: result.guard });

    return { allowed: result.guard.allowed, message: onboardingSubmitMessage(result.guard) };
  }

  const page = useMemo(() => {
    if (route.path === "/media/director-command-center") {
      return "director";
    }

    if (route.path === "/media/manager-workbench") {
      return "manager";
    }

    if (route.path === "/media/china-ecosystem") {
      return "ecosystem";
    }

    if (route.path === "/media/integration-wizard/:id") {
      return "integration";
    }

    if (route.path === "/media/commercial-tests/:id") {
      return "commercial";
    }

    return "publisher";
  }, [route.path]);

  return (
    <section className="space-y-6">
      {page === "ecosystem" ? (
        <OperatingPageHeader
          title={getRouteDisplayTitle(route, locale)}
          description={t("media.ecosystemDescription")}
          pageType={getRoutePageType(route, locale)}
          role={getRoleDisplayName(role.code, locale)}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <OperatingPageHeader
            title={getRouteDisplayTitle(route, locale)}
            description={page === "director" ? t("media.directorDescription") : t("media.mainlineDescription")}
            pageType={getRoutePageType(route, locale)}
            role={getRoleDisplayName(role.code, locale)}
          />
          {page === "manager" ? (
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              type="button"
              onClick={() => setPublisherOnboardingOpen(true)}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("media.newPublisher")}
            </button>
          ) : null}
        </div>
      )}

      {page === "ecosystem" ? (
        <MetricStrip
          label={getRouteDisplayTitle(route, locale)}
          items={[
            { label: t("media.activeLeads"), value: String(ecosystemSummary.activeLeads), tone: "success" },
            { label: t("media.priority70"), value: String(ecosystemSummary.highPriority), tone: "warning" },
            { label: t("media.gateEligible"), value: String(ecosystemSummary.eligibleForTrustedSupply), tone: "success" },
            { label: t("media.trustedCandidates"), value: String(ecosystemSummary.trustedCandidates), tone: "warning" }
          ]}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label={t("media.publishers")} value={String(summary.total)} />
          <SummaryCard label={t("media.techLive")} value={String(summary.technicalLive)} tone="success" />
          <SummaryCard label={t("media.testPassed")} value={String(summary.testPassed)} tone="success" />
          <SummaryCard label={t("media.salesReady")} value={String(summary.proposalSelectable)} tone="warning" />
          <SummaryCard label={t("media.highRisk")} value={String(summary.highRisk)} tone="danger" />
        </div>
      )}

      {message ? <GuardNotice message={message} /> : null}

      {page === "ecosystem" ? (
        <ChinaMediaEcosystemWorkspace
          state={state}
          user={user}
          selectedObjectId={selectedObjectId}
          onRunAction={runAction}
          onRouteChange={onRouteChange}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <PublisherSelector
          publishers={state.publishers}
          selectedPublisherId={selectedPublisher?.id}
          onSelect={(publisherId) => setSelectedPublisherId(publisherId)}
          onOpen360={() => onRouteChange("/media/publishers/:id", selectedPublisher?.id)}
        />

        {page === "manager" ? (
          <MediaManagerWorkbench
            queue={queue}
            onSelect={(publisherId) => setSelectedPublisherId(publisherId)}
            onOpen360={(publisherId) => {
              setSelectedPublisherId(publisherId);
              onRouteChange("/media/publishers/:id", publisherId);
            }}
            onAddSlot={(publisherId) =>
              runAction(t("media.addAdSlot"), () =>
                mediaWorkflowService.addAdSlot(state, user, publisherId, {
                  slotName: "Rewarded Video",
                  adFormat: "Video",
                  placementType: "In-app",
                  floorPrice: 16,
                  dailyRequests: 1500000
                })
              )
            }
          />
        ) : null}

        {page === "director" ? (
          <MediaDirectorCommandCenter
            snapshot={selectedSnapshot}
            onOpen360={() => selectedPublisher && onRouteChange("/media/publishers/:id", selectedPublisher.id)}
            onApprove={(publisherId, targetStatus) =>
              runAction(t("media.approveSalesReadiness"), () =>
                mediaWorkflowService.approveSalesReadiness(state, user, publisherId, targetStatus)
              )
            }
          />
        ) : null}

        {page === "publisher" && selectedSnapshot ? (
          <Publisher360
            snapshot={selectedSnapshot}
            trustedSnapshot={trustedSupplyNetworkService.getSnapshot(state, selectedSnapshot.publisher!.id)}
            ownerRole={user.activeRole}
            onEditProfile={openPublisherEditor}
            onAddSlot={() =>
              runAction(t("media.addAdSlot"), () =>
                mediaWorkflowService.addAdSlot(state, user, selectedSnapshot.publisher!.id, {
                  slotName: "In-feed Display",
                  adFormat: "Display",
                  placementType: "Feed",
                  floorPrice: 12,
                  dailyRequests: 800000
                })
              )
            }
            onAddTerm={() =>
              runAction(t("media.addCommercialTerms"), () =>
                mediaWorkflowService.addContractTerm(state, user, selectedSnapshot.publisher!.id, {
                  contractType: "Framework",
                  billingModel: "CPM",
                  settlementCycle: "Monthly",
                  paymentTerms: "Net 30",
                  revenueShare: 0.66
                })
              )
            }
            onOpenIntegration={() => onRouteChange("/media/integration-wizard/:id", selectedSnapshot.publisher!.id)}
            onOpenTest={() => onRouteChange("/media/commercial-tests/:id", selectedSnapshot.publisher!.id)}
            onEvaluateTrust={() =>
              runAction(t("trusted.evaluate"), () =>
                trustedSupplyNetworkService.evaluatePublisher(state, user, selectedSnapshot.publisher!.id)
              )
            }
            onConfirmPool={() =>
              runAction(t("trusted.confirmPool"), () =>
                trustedSupplyNetworkService.confirmPool(state, user, selectedSnapshot.publisher!.id)
              )
            }
            onCreatePackage={() =>
              runAction(t("trusted.createPackage"), () =>
                trustedSupplyNetworkService.createSupplyPackage(state, user, selectedSnapshot.publisher!.id)
              )
            }
            onActivatePackage={(packageId) =>
              runAction(t("trusted.activatePackage"), () =>
                trustedSupplyNetworkService.activateSupplyPackage(state, user, packageId)
              )
            }
          />
        ) : null}

        {page === "integration" && selectedPublisher ? (
          <IntegrationWizard
            publisher={selectedPublisher}
            state={state}
            onStart={() =>
              runAction(t("integration.startExecution"), () =>
                mediaWorkflowService.startTechnicalExecution(state, user, selectedPublisher.id)
              )
            }
            onRecordEvidence={(input) =>
              runAction(t("integration.recordEvidence"), () =>
                mediaWorkflowService.recordTechnicalEvidence(state, user, selectedPublisher.id, input)
              )
            }
            onSetBlocker={(blocker) =>
              runAction(t("integration.setBlocker"), () =>
                mediaWorkflowService.setTechnicalBlocker(state, user, selectedPublisher.id, blocker)
              )
            }
            onResolveBlocker={() =>
              runAction(t("integration.resolveBlocker"), () =>
                mediaWorkflowService.resolveTechnicalBlocker(state, user, selectedPublisher.id)
              )
            }
            onSubmit={() =>
              runAction(t("integration.submitReadiness"), () =>
                mediaWorkflowService.submitTechnicalValidation(state, user, selectedPublisher.id)
              )
            }
          />
        ) : null}

        {page === "commercial" && selectedPublisher ? (
          <CommercialTestWorkspace
            publisher={selectedPublisher}
            tests={state.commercialTests.filter((test) => test.publisher_id === selectedPublisher.id)}
            onCreateTest={() =>
              runAction(t("media.createCommercialTest"), () => mediaWorkflowService.createCommercialTest(state, user, selectedPublisher.id))
            }
            onPassLatestTest={() => {
              const latest = state.commercialTests.find((test) => test.publisher_id === selectedPublisher.id);
              runAction(t("media.submitCommercialConclusion"), () =>
                mediaWorkflowService.submitCommercialTestConclusion(state, user, latest?.id ?? "missing-test", "test_passed")
              );
            }}
          />
        ) : null}
        </div>
      )}
      <PublisherOnboardingWizard
        open={publisherOnboardingOpen}
        onClose={() => setPublisherOnboardingOpen(false)}
        onSubmit={submitPublisherOnboarding}
      />
      <PublisherOnboardingWizard
        open={publisherEditorOpen}
        mode="edit"
        initialDraft={publisherEditorDraft}
        onClose={() => setPublisherEditorOpen(false)}
        onSubmit={submitPublisherUpdate}
      />
    </section>
  );
}

function GuardNotice({ message }: { message: ActionMessage }) {
  const { locale, t } = useLocale();
  const tone = message.guard.allowed ? (message.guard.severity === "warning" ? "warning" : "success") : "danger";
  const guardMessages: Record<string, string> = {
    PUBLISHER_CREATED: locale === "zh-CN" ? "媒体已创建，并已初始化技术集成项目。" : message.guard.message,
    PUBLISHER_ONBOARDING_CREATED: locale === "zh-CN" ? "媒体准入包已创建，包含媒体资产、流量、广告位、联系人、商务条款和技术项目。" : message.guard.message,
    PUBLISHER_ONBOARDING_UPDATED: locale === "zh-CN" ? "媒体准入资料已更新，并保持与技术集成项目的关联。" : message.guard.message,
    PUBLISHER_NAME_DUPLICATE: t("media.duplicateName"),
    PUBLISHER_IDENTIFIER_DUPLICATE: t("media.duplicateIdentifier"),
    AD_SLOT_CREATED: locale === "zh-CN" ? "媒体广告位已新增。" : message.guard.message,
    CONTRACT_TERM_CREATED: locale === "zh-CN" ? "媒体商务条款已新增。" : message.guard.message,
    TRUST_SCORE_EVALUATED: locale === "zh-CN" ? "可信供给评分已完成，仍需人工确认运营池。" : message.guard.message,
    TRUST_POOL_CONFIRMED: locale === "zh-CN" ? "可信供给运营池已确认，但不会自动批准规模化销售。" : message.guard.message,
    SUPPLY_PACKAGE_CREATED: locale === "zh-CN" ? "受控供给包已按草稿状态创建。" : message.guard.message,
    SUPPLY_PACKAGE_ACTIVATED: locale === "zh-CN" ? "供给包已激活，可用于受控销售推荐。" : message.guard.message
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-blue-600" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{message.title}</p>
            <StatusBadge tone={tone}>{message.guard.reason_code}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{guardMessages[message.guard.reason_code] ?? message.guard.message}</p>
          {message.guard.required_approval_role ? (
            <p className="mt-1 text-sm text-slate-500">{t("workbench.owner")}: {getRoleDisplayName(message.guard.required_approval_role as BusinessUser["activeRole"], locale)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChinaMediaEcosystemWorkspace({
  state,
  user,
  selectedObjectId,
  onRunAction,
  onRouteChange
}: {
  state: MediaWorkflowState;
  user: BusinessUser;
  selectedObjectId?: EntityId;
  onRunAction: (title: string, action: () => MediaActionResult) => void;
  onRouteChange: (path: string, objectId?: EntityId) => void;
}) {
  const { locale, t } = useLocale();
  const [workspaceView, setWorkspaceView] = useState<EcosystemWorkspaceView>("operations");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [batchControlsOpen, setBatchControlsOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId>(state.mediaEcosystemLeads[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<MediaEcosystemOperationalQueueKey>("ALL");
  const [trackFilter, setTrackFilter] = useState<"ALL" | MediaEcosystemTrack>("ALL");
  const [stageFilter, setStageFilter] = useState<"ALL" | MediaExpansionStage>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<EcosystemPriorityFilter>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<EcosystemOwnerFilter>("ALL");
  const [reviewFilter, setReviewFilter] = useState<EcosystemReviewFilter>("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState("ALL");
  const [visibleLeadCount, setVisibleLeadCount] = useState(ecosystemListPageSize);
  const [selectedBatchLeadIds, setSelectedBatchLeadIds] = useState<EntityId[]>([]);
  const operationalQueues = chinaMediaEcosystemService.getOperationalQueues(state);
  const trackOpportunities = chinaMediaEcosystemService.getTrackOpportunities(state);
  const pipeline = chinaMediaEcosystemService.getPipeline(state);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const seedConfidenceOptions = useMemo(
    () =>
      Array.from(new Set(state.mediaEcosystemLeads.map((lead) => lead.seed_confidence).filter(Boolean) as string[])).sort(
        (left, right) => left.localeCompare(right)
      ),
    [state.mediaEcosystemLeads]
  );
  const filteredLeads = useMemo(
    () =>
      [...state.mediaEcosystemLeads]
        .sort((left, right) => right.priority_score - left.priority_score || left.media_name.localeCompare(right.media_name))
        .filter((lead) => {
          const searchableText = [
            lead.media_name,
            lead.company_name,
            lead.next_action,
            mediaEcosystemTrackLabels[lead.track],
            getEcosystemTrackLabel(lead.track, locale)
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            (normalizedSearchQuery.length === 0 || searchableText.includes(normalizedSearchQuery)) &&
            chinaMediaEcosystemService.matchesOperationalQueue(lead, queueFilter) &&
            (trackFilter === "ALL" || lead.track === trackFilter) &&
            (stageFilter === "ALL" || lead.stage === stageFilter) &&
            matchesEcosystemPriority(lead, priorityFilter) &&
            matchesEcosystemOwner(lead, ownerFilter, user) &&
            matchesEcosystemReview(lead, reviewFilter) &&
            (confidenceFilter === "ALL" || lead.seed_confidence === confidenceFilter)
          );
        }),
    [confidenceFilter, locale, normalizedSearchQuery, ownerFilter, priorityFilter, queueFilter, reviewFilter, stageFilter, state.mediaEcosystemLeads, trackFilter, user]
  );
  const visibleLeads = filteredLeads.slice(0, visibleLeadCount);
  const visibleLeadIds = visibleLeads.map((lead) => lead.id);
  const selectedBatchLeadIdSet = useMemo(() => new Set(selectedBatchLeadIds), [selectedBatchLeadIds]);
  const selectedLead =
    state.mediaEcosystemLeads.find((lead) => lead.id === selectedLeadId) ??
    visibleLeads.find((lead) => lead.id === selectedLeadId) ??
    visibleLeads[0] ??
    filteredLeads[0] ??
    state.mediaEcosystemLeads[0];
  const selectedCandidate = selectedLead
    ? state.trustedSupplyCandidates.find((candidate) => candidate.lead_id === selectedLead.id)
    : undefined;
  const eligibility = selectedLead ? chinaMediaEcosystemService.evaluateTrustedSupplyEligibility(selectedLead) : undefined;
  const handoff = selectedCandidate
    ? chinaMediaEcosystemService.getOnboardingHandoff(state, selectedCandidate.id)
    : undefined;
  const primaryAction = getEcosystemPrimaryAction(selectedLead, selectedCandidate, Boolean(handoff?.confirmed));
  const selectedActivities = selectedLead
    ? state.mediaOutreachActivities.filter((activity) => activity.lead_id === selectedLead.id).slice(0, 5)
    : [];
  const activeQueue = operationalQueues.find((queue) => queue.key === queueFilter) ?? operationalQueues[0];
  const activeQueueCopy = getEcosystemQueueCopy(activeQueue?.key ?? "ALL", locale);
  const actionLabels: Record<EcosystemPrimaryAction, string> = {
    claimOwner: t("media.claimOwner"),
    markReviewed: t("media.markReviewed"),
    priorityScreen: t("media.priorityScreen"),
    recordContact: t("media.recordContact"),
    qualify: t("media.qualify"),
    approveGate: t("media.approveGate"),
    trustedCandidate: t("media.trustedCandidate"),
    startReadiness: t("media.startReadiness"),
    techReview: t("media.techReview"),
    commercialReview: t("media.commercialReview"),
    onboardingProject: t("media.onboardingProject"),
    confirmHandoff: t("media.confirmHandoff")
  };
  const priorityFilterLabels: Record<EcosystemPriorityFilter, string> = {
    ALL: t("media.allScores"),
    HIGH: t("media.scoreHigh"),
    WATCH: t("media.scoreWatch"),
    UNSCORED: t("media.unscored")
  };
  const ownerFilterLabels: Record<EcosystemOwnerFilter, string> = {
    ALL: t("media.allOwners"),
    NO_USER_OWNER: t("media.noUserOwner"),
    MINE: t("media.myLeads"),
    MEDIA_MANAGER_ROLE: t("media.mediaManager"),
    MEDIA_DIRECTOR_ROLE: t("media.mediaDirector"),
    OPERATIONS_DIRECTOR_ROLE: t("media.operationsDirector")
  };
  const reviewFilterLabels: Record<EcosystemReviewFilter, string> = {
    ALL: t("media.allReviewStates"),
    REVIEW_REQUIRED: t("media.reviewRequired"),
    SEED_ONLY: t("media.seedOnly"),
    MANUAL_REVIEWED: t("media.manualReviewed"),
    UNVERIFIED: t("media.unverified"),
    VERIFIED: t("media.verified")
  };
  const activeFilterCount = [
    queueFilter !== "ALL",
    trackFilter !== "ALL",
    stageFilter !== "ALL",
    priorityFilter !== "ALL",
    ownerFilter !== "ALL",
    reviewFilter !== "ALL",
    confidenceFilter !== "ALL",
    normalizedSearchQuery.length > 0
  ].filter(Boolean).length;

  useEffect(() => {
    setSelectedBatchLeadIds([]);
  }, [confidenceFilter, normalizedSearchQuery, ownerFilter, priorityFilter, queueFilter, reviewFilter, stageFilter, trackFilter]);

  useEffect(() => {
    if (!selectedObjectId) {
      return;
    }

    const candidate = state.trustedSupplyCandidates.find((item) => item.id === selectedObjectId);
    const leadId = candidate?.lead_id ?? state.mediaEcosystemLeads.find((lead) => lead.id === selectedObjectId)?.id;
    if (leadId) {
      setSelectedLeadId(leadId);
    }
  }, [selectedObjectId, state.mediaEcosystemLeads, state.trustedSupplyCandidates]);

  function resetOpportunityFilters() {
    setSearchQuery("");
    setQueueFilter("ALL");
    setTrackFilter("ALL");
    setStageFilter("ALL");
    setPriorityFilter("ALL");
    setOwnerFilter("ALL");
    setReviewFilter("ALL");
    setConfidenceFilter("ALL");
    setVisibleLeadCount(ecosystemListPageSize);
    setSelectedBatchLeadIds([]);
  }

  function toggleBatchLead(leadId: EntityId) {
    if (!selectedBatchLeadIds.includes(leadId)) {
      setBatchControlsOpen(true);
    }
    setSelectedBatchLeadIds((currentIds) =>
      currentIds.includes(leadId)
        ? currentIds.filter((id) => id !== leadId)
        : currentIds.length >= mediaEcosystemBatchOperationLimit
          ? currentIds
          : [...currentIds, leadId]
    );
  }

  function selectVisibleBatchLeads() {
    setBatchControlsOpen(true);
    setSelectedBatchLeadIds(visibleLeadIds.slice(0, mediaEcosystemBatchOperationLimit));
  }

  function runBatchAction(title: string, action: () => MediaActionResult) {
    onRunAction(title, action);
    setSelectedBatchLeadIds([]);
  }

  function runPrimaryAction(action: EcosystemPrimaryAction) {
    if (!selectedLead) {
      return;
    }

    if (action === "claimOwner") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.claimLeadOwner(state, user, selectedLead.id));
      return;
    }

    if (action === "markReviewed") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.markManualReviewed(state, user, selectedLead.id));
      return;
    }

    if (action === "priorityScreen") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.scoreLeadPriority(state, user, selectedLead.id));
      return;
    }

    if (action === "recordContact") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.recordContacted(state, user, selectedLead.id));
      return;
    }

    if (action === "qualify") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.qualifyBusinessReadiness(state, user, selectedLead.id));
      return;
    }

    if (action === "approveGate") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.approveTrustedSupplyGate(state, user, selectedLead.id));
      return;
    }

    if (action === "trustedCandidate") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.createTrustedSupplyCandidate(state, user, selectedLead.id));
      return;
    }

    if (!selectedCandidate) {
      return;
    }

    if (action === "startReadiness") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.startCandidateReadiness(state, user, selectedCandidate.id));
      return;
    }

    if (action === "techReview") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.completeCandidateTechnicalReview(state, user, selectedCandidate.id));
      return;
    }

    if (action === "commercialReview") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.completeCandidateCommercialReview(state, user, selectedCandidate.id));
      return;
    }

    if (action === "onboardingProject") {
      onRunAction(actionLabels[action], () => chinaMediaEcosystemService.createOnboardingProject(state, user, selectedCandidate.id));
      return;
    }

    onRunAction(actionLabels[action], () => chinaMediaEcosystemService.confirmOnboardingHandoff(state, user, selectedCandidate.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 sm:w-auto" role="tablist">
          <button
            className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition sm:flex-none ${
              workspaceView === "operations" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            type="button"
            role="tab"
            aria-selected={workspaceView === "operations"}
            onClick={() => setWorkspaceView("operations")}
          >
            <LayoutList className="size-4" aria-hidden="true" />
            {t("media.operationsView")}
          </button>
          <button
            className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition sm:flex-none ${
              workspaceView === "insights" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            type="button"
            role="tab"
            aria-selected={workspaceView === "insights"}
            onClick={() => setWorkspaceView("insights")}
          >
            <BarChart3 className="size-4" aria-hidden="true" />
            {t("media.insightsView")}
          </button>
        </div>
        <p className="text-sm leading-6 text-slate-500">
          {workspaceView === "operations" ? t("media.operationsViewDescription") : t("media.insightsViewDescription")}
        </p>
      </div>

      {workspaceView === "operations" ? (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{t("media.operationalQueues")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{activeQueueCopy.nextAction}</p>
          </div>
          <StatusBadge tone={activeFilterCount > 0 ? "info" : "neutral"}>{t("media.activeFilters", { count: activeFilterCount })}</StatusBadge>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {operationalQueues.map((queue) => (
            <button
              key={queue.key}
              className={`flex min-w-40 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                queueFilter === queue.key ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
              type="button"
              onClick={() => {
                setQueueFilter(queue.key);
                setVisibleLeadCount(ecosystemListPageSize);
              }}
            >
              <p className="text-sm font-semibold text-slate-900">{getEcosystemQueueCopy(queue.key, locale).label}</p>
              <StatusBadge tone={queue.tone}>{String(queue.count)}</StatusBadge>
            </button>
          ))}
        </div>
      </section>
      ) : null}

      {workspaceView === "insights" ? (
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Map className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">{t("media.strategicTrackMap")}</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trackOpportunities.map((track) => (
              <article key={track.track} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{getEcosystemTrackLabel(track.track, locale)}</p>
                  <StatusBadge tone={track.gapLevel === "covered" ? "success" : track.gapLevel === "watch" ? "warning" : "danger"}>
                    {getEcosystemGapCopy(track.gapLevel, locale).label}
                  </StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <MetricMini label={t("media.leads")} value={String(track.leads)} />
                  <MetricMini label={t("media.topScore")} value={String(track.highestScore)} />
                  <MetricMini label={t("media.candidates")} value={String(track.trustedCandidates)} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{getEcosystemGapCopy(track.gapLevel, locale).nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">{t("media.expansionPipeline")}</h2>
          </div>
          <div className="mt-4 space-y-2">
            {pipeline.map((lane) => (
              <div key={lane.stage} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">{getEcosystemStageLabel(lane.stage, locale)}</span>
                <span className="text-sm font-semibold text-slate-950">{lane.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      ) : null}

      {workspaceView === "operations" ? (
      <div className="grid min-w-0 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("media.opportunityPool")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {t("media.visibleTotal", { visible: filteredLeads.length, total: state.mediaEcosystemLeads.length })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge tone={filteredLeads.length > 0 ? "info" : "warning"}>{String(visibleLeads.length)}</StatusBadge>
                {activeFilterCount > 0 ? (
                  <button
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    type="button"
                    onClick={resetOpportunityFilters}
                  >
                    {t("media.reset")}
                  </button>
                ) : null}
              </div>
            </div>
            <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600">
              <Search className="size-4 text-slate-400" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                value={searchQuery}
                placeholder={t("media.searchMedia")}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              />
            </label>
            <button
              className="mt-3 flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              type="button"
              aria-expanded={advancedFiltersOpen}
              onClick={() => setAdvancedFiltersOpen((open) => !open)}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {t("media.advancedFilters")}
                {activeFilterCount > 0 ? <StatusBadge tone="info">{String(activeFilterCount)}</StatusBadge> : null}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                {advancedFiltersOpen ? t("media.hideFilters") : t("media.showFilters")}
                <ChevronDown className={`size-4 transition ${advancedFiltersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </button>
            {advancedFiltersOpen ? (
            <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={trackFilter}
                onChange={(event) => {
                  setTrackFilter(event.target.value as "ALL" | MediaEcosystemTrack);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                <option value="ALL">{t("media.allTracks")}</option>
                {(Object.keys(mediaEcosystemTrackLabels) as MediaEcosystemTrack[]).map((track) => (
                  <option key={track} value={track}>
                    {getEcosystemTrackLabel(track, locale)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={stageFilter}
                onChange={(event) => {
                  setStageFilter(event.target.value as "ALL" | MediaExpansionStage);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage === "ALL" ? t("media.allStages") : getEcosystemStageLabel(stage, locale)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value as EcosystemPriorityFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemPriorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {priorityFilterLabels[option]}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value as EcosystemOwnerFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemOwnerOptions.map((option) => (
                  <option key={option} value={option}>
                    {ownerFilterLabels[option]}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={reviewFilter}
                onChange={(event) => {
                  setReviewFilter(event.target.value as EcosystemReviewFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemReviewOptions.map((option) => (
                  <option key={option} value={option}>
                    {reviewFilterLabels[option]}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={confidenceFilter}
                onChange={(event) => {
                  setConfidenceFilter(event.target.value);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                <option value="ALL">{t("media.allSeedConfidence")}</option>
                {seedConfidenceOptions.map((confidence) => (
                  <option key={confidence} value={confidence}>
                    {confidence}
                  </option>
                ))}
              </select>
            </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={queueFilter === "ALL" ? "neutral" : "info"}>
                {activeQueueCopy.label}
              </StatusBadge>
              {reviewFilter !== "ALL" ? <StatusBadge tone="warning">{reviewFilterLabels[reviewFilter]}</StatusBadge> : null}
              {ownerFilter !== "ALL" ? <StatusBadge tone="info">{ownerFilterLabels[ownerFilter]}</StatusBadge> : null}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                type="button"
                aria-expanded={batchControlsOpen}
                onClick={() => setBatchControlsOpen((open) => !open)}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{t("media.batchControls")}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {t("media.selectedMax", { selected: selectedBatchLeadIds.length, max: mediaEcosystemBatchOperationLimit })}
                  </span>
                </span>
                <StatusBadge tone={selectedBatchLeadIds.length > 0 ? "info" : "neutral"}>
                  {String(selectedBatchLeadIds.length)}
                </StatusBadge>
              </button>
              {batchControlsOpen ? (
              <div className="mt-3 grid gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={visibleLeadIds.length === 0}
                  onClick={selectVisibleBatchLeads}
                >
                  {t("media.selectVisible")}
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={selectedBatchLeadIds.length === 0}
                  onClick={() => setSelectedBatchLeadIds([])}
                >
                  {t("media.clearSelected")}
                </button>
                <button
                  className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={selectedBatchLeadIds.length === 0}
                  onClick={() =>
                    runBatchAction("Batch assign ecosystem owners", () =>
                      chinaMediaEcosystemService.batchClaimLeadOwners(state, user, selectedBatchLeadIds)
                    )
                  }
                >
                  {t("media.batchAssignOwner")}
                </button>
                <button
                  className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={selectedBatchLeadIds.length === 0}
                  onClick={() =>
                    runBatchAction("Batch mark seed reviewed", () =>
                      chinaMediaEcosystemService.batchMarkManualReviewed(state, user, selectedBatchLeadIds)
                    )
                  }
                >
                  {t("media.batchMarkReviewed")}
                </button>
                <p className="text-xs leading-5 text-slate-500">{t("media.batchHint")}</p>
              </div>
              ) : null}
            </div>
          </div>
          {visibleLeads.map((lead) => {
            const isBatchSelected = selectedBatchLeadIdSet.has(lead.id);
            const isDetailSelected = selectedLead?.id === lead.id;

            return (
              <article
                key={lead.id}
                className={`w-full rounded-lg border p-4 shadow-card transition ${
                  isDetailSelected || isBatchSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <label className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center">
                    <input
                      className="size-4 rounded border-slate-300 text-blue-600"
                      type="checkbox"
                      checked={isBatchSelected}
                      onChange={() => toggleBatchLead(lead.id)}
                    />
                    <span className="sr-only">{t("media.selectVisible")} {lead.media_name}</span>
                  </label>
                  <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setSelectedLeadId(lead.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lead.media_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{getEcosystemTrackLabel(lead.track, locale)}</p>
                      </div>
                      <StatusBadge tone={lead.priority_score >= 70 ? "success" : lead.priority_score >= 50 ? "warning" : "danger"}>
                        {String(lead.priority_score)}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone={toneForExpansionStage(lead.stage)}>{getEcosystemStageLabel(lead.stage, locale)}</StatusBadge>
                      <StatusBadge tone={lead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>
                        {getEcosystemDataQualityLabel(lead.data_quality_level, locale)}
                      </StatusBadge>
                      <StatusBadge tone={lead.owner_user_id ? "success" : "warning"}>
                        {lead.owner_user_id ? t("media.userOwner") : t("media.noUserOwner")}
                      </StatusBadge>
                      <StatusBadge tone={lead.risk_level === "critical" || lead.risk_level === "high" ? "danger" : "neutral"}>
                        {lead.risk_level}
                      </StatusBadge>
                    </div>
                  </button>
                </div>
              </article>
            );
          })}
          {filteredLeads.length > visibleLeads.length ? (
            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-card hover:bg-slate-50"
              type="button"
              onClick={() => setVisibleLeadCount((count) => count + ecosystemListPageSize)}
            >
              {t("media.showMore")}
            </button>
          ) : null}
          {filteredLeads.length === 0 && state.mediaEcosystemLeads.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-card">
              {t("media.noMatching")}
            </div>
          ) : null}
        </aside>

        {selectedLead ? (
          <section className="space-y-4">
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-normal text-slate-950">{selectedLead.media_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedLead.region} / {getEcosystemTrackLabel(selectedLead.track, locale)} / {t("media.owner")} {getRoleDisplayName(selectedLead.owner_role, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={toneForExpansionStage(selectedLead.stage)}>{getEcosystemStageLabel(selectedLead.stage, locale)}</StatusBadge>
                  <StatusBadge tone={selectedLead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>
                    {getEcosystemDataQualityLabel(selectedLead.data_quality_level, locale)}
                  </StatusBadge>
                  <StatusBadge tone={selectedLead.verification_status === "VERIFIED" ? "success" : "info"}>
                    {getEcosystemVerificationLabel(selectedLead.verification_status, locale)}
                  </StatusBadge>
                  <StatusBadge tone={selectedLead.priority_score >= 70 ? "success" : "warning"}>
                    {`${t("media.priorityScore")} ${selectedLead.priority_score}`}
                  </StatusBadge>
                  {selectedCandidate ? (
                    <StatusBadge tone={toneForCandidateStatus(selectedCandidate.status)}>
                      {getEcosystemCandidateStatusLabel(selectedCandidate.status, locale)}
                    </StatusBadge>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <SignalCheck label={t("media.contact")} checked={selectedLead.media_contact_confirmed} />
                <SignalCheck label={t("media.businessInterest")} checked={selectedLead.business_interest_confirmed} />
                <SignalCheck label={t("media.inventory")} checked={selectedLead.ad_inventory_identified} />
                <SignalCheck label={t("media.feasibility")} checked={selectedLead.integration_feasibility !== "impossible"} />
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                <NextActionBar
                  heading={t("media.currentDecision")}
                  status={getEcosystemStageLabel(selectedLead.stage, locale)}
                  statusTone={toneForExpansionStage(selectedLead.stage)}
                  nextActionLabel={t("media.nextAction")}
                  nextAction={primaryAction ? actionLabels[primaryAction] : t("media.noFurtherAction")}
                  ownerLabel={t("media.owner")}
                  owner={selectedLead.owner_user_id
                    ? `${getRoleDisplayName(selectedLead.owner_role, locale)} / ${selectedLead.owner_user_id}`
                    : `${getRoleDisplayName(selectedLead.owner_role, locale)} / ${t("media.notAssigned")}`}
                  blockerLabel={t("media.blocker")}
                  blocker={eligibility?.blockers[0] ? getEcosystemBlockerLabel(eligibility.blockers[0], locale) : undefined}
                  dueDateLabel={t("media.dueDate")}
                  dueDate={selectedLead.last_touch_at ?? t("media.notScheduled")}
                  actionLabel={primaryAction ? actionLabels[primaryAction] : undefined}
                  onAction={primaryAction ? () => runPrimaryAction(primaryAction) : undefined}
                />
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                  {t("media.moreActions")}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </summary>
                <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white p-4">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.claimOwner"), () =>
                      chinaMediaEcosystemService.claimLeadOwner(state, user, selectedLead.id)
                    )
                  }
                >
                  <UserCheck className="size-4" aria-hidden="true" />
                  {t("media.claimOwner")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.markReviewed"), () =>
                      chinaMediaEcosystemService.markManualReviewed(state, user, selectedLead.id)
                    )
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {t("media.markReviewed")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.priorityScreen"), () =>
                      chinaMediaEcosystemService.scoreLeadPriority(state, user, selectedLead.id)
                    )
                  }
                >
                  <Target className="size-4" aria-hidden="true" />
                  {t("media.priorityScreen")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.recordContact"), () =>
                      chinaMediaEcosystemService.recordContacted(state, user, selectedLead.id)
                    )
                  }
                >
                  <Send className="size-4" aria-hidden="true" />
                  {t("media.recordContact")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.qualify"), () =>
                      chinaMediaEcosystemService.qualifyBusinessReadiness(state, user, selectedLead.id)
                    )
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {t("media.qualify")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.approveGate"), () =>
                      chinaMediaEcosystemService.approveTrustedSupplyGate(state, user, selectedLead.id)
                    )
                  }
                >
                  <UserCheck className="size-4" aria-hidden="true" />
                  {t("media.approveGate")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                  type="button"
                  onClick={() =>
                    onRunAction(t("media.trustedCandidate"), () =>
                      chinaMediaEcosystemService.createTrustedSupplyCandidate(state, user, selectedLead.id)
                    )
                  }
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                  {t("media.trustedCandidate")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={!selectedCandidate}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction(t("media.startReadiness"), () =>
                      chinaMediaEcosystemService.startCandidateReadiness(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                  {t("media.startReadiness")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={!selectedCandidate}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction(t("media.techReview"), () =>
                      chinaMediaEcosystemService.completeCandidateTechnicalReview(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <Wrench className="size-4" aria-hidden="true" />
                  {t("media.techReview")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={!selectedCandidate}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction(t("media.commercialReview"), () =>
                      chinaMediaEcosystemService.completeCandidateCommercialReview(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <TestTube2 className="size-4" aria-hidden="true" />
                  {t("media.commercialReview")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={!selectedCandidate || selectedCandidate.status !== "onboarding_ready"}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction(t("media.onboardingProject"), () =>
                      chinaMediaEcosystemService.createOnboardingProject(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t("media.onboardingProject")}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  type="button"
                  disabled={!selectedCandidate || selectedCandidate.status !== "onboarding_project_created" || handoff?.confirmed}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction(t("media.confirmHandoff"), () =>
                      chinaMediaEcosystemService.confirmOnboardingHandoff(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <Handshake className="size-4" aria-hidden="true" />
                  {t("media.confirmHandoff")}
                </button>
                </div>
              </details>
            </article>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <SeedReviewPanel lead={selectedLead} />
                <ScoreBreakdownPanel
                  lead={selectedLead}
                  onApplyScore={(scoreBreakdown) =>
                    onRunAction(t("media.applyScore"), () =>
                      chinaMediaEcosystemService.applyManualScore(state, user, selectedLead.id, scoreBreakdown)
                    )
                  }
                />
              </div>
              <EligibilityPanel lead={selectedLead} candidate={selectedCandidate} blockers={eligibility?.blockers ?? []} />
            </div>

            {handoff ? (
              <OnboardingHandoffPanel handoff={handoff} user={user} onRouteChange={onRouteChange} />
            ) : null}

            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-base font-semibold text-slate-950">{t("media.outreachTrail")}</h2>
              <div className="mt-4 space-y-2">
                {selectedActivities.length > 0 ? (
                  selectedActivities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">{activity.event}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getRoleDisplayName(activity.actor_role, locale)} / {activity.created_at}
                      </p>
                      {activity.notes ? <p className="mt-2 text-xs leading-5 text-slate-500">{activity.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("media.noOutreach")}</p>
                )}
              </div>
            </article>
          </section>
        ) : (
          <GuidedEmptyState
            title={t("media.noLeads")}
            description={t("media.noLeadsDescription")}
            ownerLabel={t("media.owner")}
            owner={getRoleDisplayName(user.activeRole, locale)}
          />
        )}
      </div>
      ) : null}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function SignalCheck({ label, checked }: { label: string; checked: boolean }) {
  const { t } = useLocale();

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <div className="mt-2">
        <StatusBadge tone={checked ? "success" : "warning"}>{checked ? t("media.confirmed") : t("media.pending")}</StatusBadge>
      </div>
    </div>
  );
}

function SeedReviewPanel({ lead }: { lead: MediaEcosystemLead }) {
  const { locale, t } = useLocale();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">{t("media.reviewOperations")}</h2>
        <StatusBadge tone={lead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>
          {getEcosystemDataQualityLabel(lead.data_quality_level, locale)}
        </StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label={t("media.verification")} value={getEcosystemVerificationLabel(lead.verification_status, locale)} />
        <Metric label={t("media.reviewRequired")} value={lead.review_required ? t("media.yes") : t("media.no")} />
        <Metric label={t("media.ownerRole")} value={getRoleDisplayName(lead.owner_role, locale)} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label={t("media.userOwner")} value={lead.owner_user_id ?? t("media.notAssigned")} />
        <Metric label={t("media.seedConfidence")} value={lead.seed_confidence ?? "-"} />
        <Metric label={t("media.source")} value={lead.source_name ?? "-"} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label={t("media.version")} value={lead.source_version ?? "-"} />
      </div>
    </article>
  );
}

function ScoreBreakdownPanel({
  lead,
  onApplyScore
}: {
  lead: MediaEcosystemLead;
  onApplyScore: (scoreBreakdown: MediaEcosystemPriorityScore) => void;
}) {
  const { t } = useLocale();
  const [draftScore, setDraftScore] = useState<MediaEcosystemPriorityScore>(lead.score_breakdown);
  useEffect(() => {
    setDraftScore(lead.score_breakdown);
  }, [lead.id, lead.score_breakdown]);

  const rows = [
    ["strategic_value", t("media.strategicValue"), 20],
    ["user_scale_growth", t("media.userScaleGrowth"), 15],
    ["ad_scenario_value", t("media.adScenarioValue"), 15],
    ["programmatic_feasibility", t("media.programmaticFeasibility"), 15],
    ["advertiser_demand_match", t("media.advertiserDemandMatch"), 15],
    ["commercial_negotiability", t("media.commercialNegotiability"), 10],
    ["risk_compliance_control", t("media.riskComplianceControl"), 10]
  ] as const;
  const draftTotal = chinaMediaEcosystemService.calculatePriorityScore(draftScore);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{t("media.priorityScore")}</h2>
        <StatusBadge tone={draftTotal >= 70 ? "success" : draftTotal > 0 ? "warning" : "neutral"}>{String(draftTotal)}</StatusBadge>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map(([key, label, max]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-600">{label}</span>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <input
                className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-blue-300"
                type="number"
                min={0}
                max={max}
                value={draftScore[key]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraftScore((current) => ({
                    ...current,
                    [key]: Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0
                  }));
                }}
              />
              <span>/ {max}</span>
            </label>
          </div>
        ))}
      </div>
      <button
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
        type="button"
        onClick={() => onApplyScore(draftScore)}
      >
        <Target className="size-4" aria-hidden="true" />
        {t("media.applyScore")}
      </button>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label={t("media.scaleNote")} value={lead.user_scale_note} />
        <Metric label={t("media.scenarioNote")} value={lead.ad_scenario_note} />
        <Metric label={t("media.demandNote")} value={lead.advertiser_demand_note} />
      </div>
    </article>
  );
}

function EligibilityPanel({
  lead,
  candidate,
  blockers
}: {
  lead: MediaEcosystemLead;
  candidate?: TrustedSupplyCandidate;
  blockers: string[];
}) {
  const { locale, t } = useLocale();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">{t("media.trustedSupplyGate")}</h2>
        <StatusBadge tone={blockers.length === 0 ? "success" : "warning"}>
          {blockers.length === 0 ? t("media.eligible") : t("media.blocked")}
        </StatusBadge>
      </div>
      <div className="mt-4 space-y-2">
        <GateRow label={t("media.sourceReviewed")} passed={lead.data_quality_level !== "SEED_ONLY"} />
        <GateRow label={t("media.scoreThreshold")} passed={lead.priority_score >= 70} />
        <GateRow label={t("media.contactConfirmed")} passed={lead.media_contact_confirmed} />
        <GateRow label={t("media.businessInterest")} passed={lead.business_interest_confirmed} />
        <GateRow label={t("media.inventory")} passed={lead.ad_inventory_identified} />
        <GateRow label={t("media.feasibilityAllowed")} passed={lead.integration_feasibility !== "impossible"} />
        <GateRow label={t("media.directorApproved")} passed={Boolean(lead.media_director_approved_at)} />
      </div>
      {lead.media_director_approved_at ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {t("media.approvedBy", {
            owner: lead.media_director_approved_by ?? t("media.mediaDirector"),
            time: lead.media_director_approved_at
          })}
        </p>
      ) : null}
      {candidate ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">{candidate.media_name}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-700">{candidate.evaluation_notes}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={toneForCandidateStatus(candidate.status)}>
              {getEcosystemCandidateStatusLabel(candidate.status, locale)}
            </StatusBadge>
            {candidate.publisher_id ? <StatusBadge tone="success">{t("media.publisherLinked")}</StatusBadge> : null}
          </div>
          <div className="mt-3 space-y-2">
            <GateRow label={t("media.readinessStarted")} passed={Boolean(candidate.readiness_started_at)} />
            <GateRow label={t("media.technicalReviewed")} passed={Boolean(candidate.technical_reviewed_at)} />
            <GateRow label={t("media.commercialReviewed")} passed={Boolean(candidate.commercial_reviewed_at)} />
            <GateRow label={t("media.onboardingReady")} passed={Boolean(candidate.onboarding_ready_at)} />
          </div>
          {candidate.readiness_notes ? <p className="mt-3 text-xs leading-5 text-emerald-700">{candidate.readiness_notes}</p> : null}
        </div>
      ) : null}
      {blockers.length > 0 ? (
        <div className="mt-3 border-l-2 border-amber-400 pl-3 text-xs leading-5 text-slate-600">
          <p className="font-semibold text-slate-800">{t("media.blockers")}</p>
          <p>{blockers.map((blocker) => getEcosystemBlockerLabel(blocker, locale)).join("; ")}</p>
        </div>
      ) : null}
    </article>
  );
}

function OnboardingHandoffPanel({
  handoff,
  user,
  onRouteChange
}: {
  handoff: OnboardingHandoffSnapshot;
  user: BusinessUser;
  onRouteChange: (path: string, objectId?: EntityId) => void;
}) {
  const { t } = useLocale();
  const canOpenIntegration = ["integration_manager", "media_director", "operations_director"].includes(user.activeRole);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Handshake className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-950">{t("media.handoffTitle")}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("media.handoffDescription")}</p>
        </div>
        <StatusBadge tone={handoff.confirmed ? "success" : "warning"}>
          {handoff.confirmed ? t("media.handoffConfirmed") : t("media.handoffPending")}
        </StatusBadge>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-y border-slate-200 py-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Publisher 360</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{handoff.publisher?.name ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">{t("media.integrationProject")}</dt>
          <dd className="mt-1 break-all text-sm font-semibold text-slate-900">{handoff.integrationProject?.id ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">{t("media.owner")}</dt>
          <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
            {handoff.candidate.owner_user_id ?? handoff.candidate.owner_role}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">{t("media.dueDate")}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{handoff.dueDate ?? "-"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{handoff.nextAction}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={!handoff.publisher}
            onClick={() => onRouteChange("/media/publishers/:id", handoff.publisher?.id)}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("media.openPublisher")}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={!handoff.publisher || !handoff.integrationProject || !canOpenIntegration}
            title={canOpenIntegration ? undefined : "Integration Manager, Media Director, or Operations Director role required."}
            onClick={() => onRouteChange("/media/integration-wizard/:id", handoff.publisher?.id)}
          >
            <Wrench className="size-4" aria-hidden="true" />
            {t("media.openIntegration")}
          </button>
        </div>
      </div>
    </article>
  );
}

function GateRow({ label, passed }: { label: string; passed: boolean }) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <StatusBadge tone={passed ? "success" : "warning"}>{passed ? t("media.confirmed") : t("media.pending")}</StatusBadge>
    </div>
  );
}

function PublisherSelector({
  publishers,
  selectedPublisherId,
  onSelect,
  onOpen360
}: {
  publishers: Publisher[];
  selectedPublisherId?: EntityId;
  onSelect: (publisherId: EntityId) => void;
  onOpen360: () => void;
}) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PublisherQueueStatusFilter>("all");
  const [sort, setSort] = useState<PublisherQueueSort>("recent");
  const visiblePublishers = useMemo(
    () => filterAndSortPublisherQueue(publishers, { query, status: statusFilter, sort }),
    [publishers, query, sort, statusFilter]
  );
  const hasFilters = query.trim().length > 0 || statusFilter !== "all";

  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("media.publisherQueue")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("media.publisherQueueDescription")}</p>
          </div>
          <StatusBadge tone="neutral">{t("media.publisherQueueCount", { visible: visiblePublishers.length, total: publishers.length })}</StatusBadge>
        </div>
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <span className="sr-only">{t("media.publisherSearch")}</span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            type="search"
            value={query}
            placeholder={t("media.publisherSearchPlaceholder")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">{t("media.publisherStatusFilter")}</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PublisherQueueStatusFilter)}
            >
              {publisherQueueStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? t("media.publisherStatusAll") : getPublisherStatusLabel(status, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t("media.publisherSort")}</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={sort}
              onChange={(event) => setSort(event.target.value as PublisherQueueSort)}
            >
              <option value="recent">{t("media.publisherSortRecent")}</option>
              <option value="name">{t("media.publisherSortName")}</option>
            </select>
          </label>
        </div>
      </div>
      <div className="max-h-[min(62vh,680px)] space-y-3 overflow-y-auto pr-1">
        {visiblePublishers.map((publisher) => (
          <button
            key={publisher.id}
            className={`w-full rounded-lg border p-4 text-left shadow-card transition ${
              selectedPublisherId === publisher.id
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            type="button"
            onClick={() => onSelect(publisher.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-slate-900">{publisher.name}</p>
              <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{getPublisherStatusLabel(publisher.sales_scale_status, locale)}</StatusBadge>
            </div>
            <p className="mt-2 truncate text-xs text-slate-500">
              {publisher.metadata?.property_identifier ?? publisher.metadata?.property_name ?? `${publisher.media_type ?? "Media"} / ${publisher.integration_type ?? "Integration"}`}
            </p>
            {publisher.updated_at ? <p className="mt-1 text-xs text-slate-400">{t("media.publisherUpdated", { date: formatUtcPlus8Date(publisher.updated_at) })}</p> : null}
          </button>
        ))}
        {visiblePublishers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">{t("media.publisherNoMatches")}</p>
            {hasFilters ? (
              <button
                className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                {t("media.clearFilters")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        className="h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        type="button"
        disabled={!selectedPublisherId}
        onClick={onOpen360}
      >
        {t("media.open360")}
      </button>
    </aside>
  );
}

function MediaManagerWorkbench({
  queue,
  onSelect,
  onOpen360,
  onAddSlot
}: {
  queue: ReturnType<typeof mediaWorkflowService.getReadinessQueue>;
  onSelect: (publisherId: EntityId) => void;
  onOpen360: (publisherId: EntityId) => void;
  onAddSlot: (publisherId: EntityId) => void;
}) {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-4">
      {queue.map(({ publisher, openBlockingCases, adSlots, terms }) => (
        <article key={publisher.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">{publisher.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {t("media.queueSignals", { slots: adSlots, terms, blockers: openBlockingCases })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={toneForStatus(publisher.technical_live_status)}>{getPublisherStatusLabel(publisher.technical_live_status, locale)}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.commercial_test_status)}>{getPublisherStatusLabel(publisher.commercial_test_status, locale)}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{getPublisherStatusLabel(publisher.sales_scale_status, locale)}</StatusBadge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onOpen360(publisher.id)}>
              {t("media.continueReadiness")}
            </button>
            <button
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() => {
                onSelect(publisher.id);
                onAddSlot(publisher.id);
              }}
            >
              {t("media.addAdSlot")}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function MediaDirectorCommandCenter({
  snapshot,
  onOpen360,
  onApprove
}: {
  snapshot?: ReturnType<typeof mediaWorkflowService.getPublisherSnapshot>;
  onOpen360: () => void;
  onApprove: (publisherId: EntityId, targetStatus: MediaDirectorApprovalTarget) => void;
}) {
  const { locale, t } = useLocale();
  const publisher = snapshot?.publisher;

  if (!snapshot || !publisher) {
    return (
      <GuidedEmptyState
        title={t("media.publisherNotFound")}
        description={t("media.publisherQueueDescription")}
        ownerLabel={t("workbench.owner")}
        owner={getRoleDisplayName("media_director", locale)}
      />
    );
  }

  const blocker = snapshot.diagnosticCases.find(
    (item) => item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
  );
  const blockerCount = snapshot.diagnosticCases.filter(
    (item) => item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
  ).length;
  const decision = getMediaDirectorDecision(publisher.sales_scale_status, blockerCount);
  const actionLabels = {
    approveLimited: t("media.approveLimited"),
    approveProposal: t("media.approveProposal"),
    approveScale: t("media.approveScale"),
    resolveBlocker: t("media.resolveReadinessBlocker"),
    monitor: t("media.monitorQuality")
  };
  const stages = getMediaDirectorReadinessSteps(publisher.sales_scale_status, blockerCount).map((step) => ({
    ...step,
    label:
      step.key === "limited"
        ? t("media.limitedSellable")
        : step.key === "proposal"
          ? t("media.proposalSelectable")
          : t("media.scaleReady")
  }));

  return (
    <div className="min-w-0 space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{publisher.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {publisher.region} / {publisher.media_type} / {publisher.integration_type}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={toneForStatus(publisher.technical_live_status)}>{getPublisherStatusLabel(publisher.technical_live_status, locale)}</StatusBadge>
            <StatusBadge tone={toneForStatus(publisher.commercial_test_status)}>{getPublisherStatusLabel(publisher.commercial_test_status, locale)}</StatusBadge>
            <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{getPublisherStatusLabel(publisher.sales_scale_status, locale)}</StatusBadge>
          </div>
        </div>
      </article>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <NextActionBar
          heading={t("media.directorDecision")}
          status={decision.state === "complete" ? t("common.complete") : decision.state === "blocked" ? t("common.blocked") : t("common.inProgress")}
          statusTone={decision.state === "complete" ? "success" : decision.state === "blocked" ? "danger" : "info"}
          nextActionLabel={t("workbench.nextAction")}
          nextAction={actionLabels[decision.action]}
          ownerLabel={t("workbench.owner")}
          owner={getRoleDisplayName("media_director", locale)}
          blockerLabel={t("workbench.blocker")}
          blocker={blocker?.current_blocker}
          dueDateLabel={t("workbench.dueDate")}
          dueDate={snapshot.integrationProjects[0]?.go_live_date ?? t("workbench.noDueDate")}
          actionLabel={decision.target ? actionLabels[decision.action] : t("media.open360")}
          onAction={decision.target ? () => onApprove(publisher.id, decision.target!) : onOpen360}
        />
      </div>

      <BusinessStagePath
        title={t("media.directorApprovalPath")}
        stages={stages}
        stateLabels={{
          complete: t("common.complete"),
          active: t("common.inProgress"),
          blocked: t("common.blocked"),
          pending: t("common.pending")
        }}
      />

      <section className="grid border-y border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <DirectorSignal label={t("media.blockers")} value={String(blockerCount)} />
        <DirectorSignal label={t("media.adSlots")} value={String(snapshot.adSlots.length)} />
        <DirectorSignal label={t("media.commercialTerms")} value={String(snapshot.contractTerms.length)} />
      </section>
    </div>
  );
}

function DirectorSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Publisher360({
  snapshot,
  trustedSnapshot,
  ownerRole,
  onEditProfile,
  onAddSlot,
  onAddTerm,
  onOpenIntegration,
  onOpenTest,
  onEvaluateTrust,
  onConfirmPool,
  onCreatePackage,
  onActivatePackage
}: {
  snapshot: ReturnType<typeof mediaWorkflowService.getPublisherSnapshot>;
  trustedSnapshot: ReturnType<typeof trustedSupplyNetworkService.getSnapshot>;
  ownerRole: BusinessUser["activeRole"];
  onEditProfile: () => void;
  onAddSlot: () => void;
  onAddTerm: () => void;
  onOpenIntegration: () => void;
  onOpenTest: () => void;
  onEvaluateTrust: () => void;
  onConfirmPool: () => void;
  onCreatePackage: () => void;
  onActivatePackage: (packageId: EntityId) => void;
}) {
  const { locale, t } = useLocale();
  const [workspaceView, setWorkspaceView] = useState<PublisherWorkspaceView>("readiness");
  const publisher = snapshot.publisher;

  if (!publisher) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">{t("media.publisherNotFound")}</div>;
  }

  const readinessInput = {
    publisher,
    contacts: snapshot.contacts,
    adSlots: snapshot.adSlots,
    contractTerms: snapshot.contractTerms,
    trustProfile: trustedSnapshot.profile,
    packages: trustedSnapshot.packages
  };
  const readinessSteps = getPublisherReadinessSteps(readinessInput);
  const primaryAction = getPublisherPrimaryAction(readinessInput);
  const draftPackage = trustedSnapshot.packages.find((item) => item.status === "draft");
  const blockingCase = snapshot.diagnosticCases.find(
    (item) => item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
  );
  const integrationBlocker = snapshot.integrationProjects.find((item) => item.blocker)?.blocker;
  const blocker = blockingCase?.current_blocker ?? integrationBlocker;
  const overallState: PublisherReadinessState = readinessSteps.some((step) => step.state === "blocked")
    ? "blocked"
    : readinessSteps.every((step) => step.state === "complete")
      ? "complete"
      : "active";
  const stateLabels: Record<PublisherReadinessState, string> = {
    complete: t("media.stateComplete"),
    active: t("media.stateActive"),
    blocked: t("media.stateBlocked"),
    pending: t("media.statePending")
  };
  const actionLabels: Record<PublisherPrimaryAction, string> = {
    editProfile: t("media.editProfile"),
    addSlot: t("media.addAdSlot"),
    addTerm: t("media.addCommercialTerms"),
    openIntegration: t("media.openIntegrationWizard"),
    openTest: t("media.openCommercialTest"),
    evaluateTrust: t("media.evaluateTrust"),
    confirmPool: t("trusted.confirmPool"),
    createPackage: t("media.createSupplyPackage"),
    activatePackage: t("media.activateSupplyPackage")
  };

  function runPrimaryAction(action: PublisherPrimaryAction) {
    if (action === "editProfile") {
      onEditProfile();
      return;
    }
    if (action === "addSlot") {
      onAddSlot();
      return;
    }
    if (action === "addTerm") {
      onAddTerm();
      return;
    }
    if (action === "openIntegration") {
      onOpenIntegration();
      return;
    }
    if (action === "openTest") {
      onOpenTest();
      return;
    }
    if (action === "evaluateTrust") {
      onEvaluateTrust();
      return;
    }
    if (action === "confirmPool") {
      onConfirmPool();
      return;
    }
    if (action === "createPackage") {
      onCreatePackage();
      return;
    }
    if (draftPackage) {
      onActivatePackage(draftPackage.id);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-normal text-slate-950">{publisher.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {publisher.region} / {publisher.media_type} / {publisher.integration_type}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <StatusBadge tone={toneForStatus(publisher.technical_live_status)}>{getPublisherStatusLabel(publisher.technical_live_status, locale)}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.commercial_test_status)}>{getPublisherStatusLabel(publisher.commercial_test_status, locale)}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{getPublisherStatusLabel(publisher.sales_scale_status, locale)}</StatusBadge>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={onEditProfile}
              >
                <Pencil className="size-4" aria-hidden="true" />
                {t("media.editProfile")}
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                type="button"
                onClick={onOpenIntegration}
              >
                <Wrench className="size-4" aria-hidden="true" />
                {t("media.openIntegrationWizard")}
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 sm:w-auto" role="tablist">
          <PublisherViewTab
            active={workspaceView === "readiness"}
            icon={ClipboardCheck}
            label={t("media.readinessView")}
            onClick={() => setWorkspaceView("readiness")}
          />
          <PublisherViewTab
            active={workspaceView === "trusted"}
            icon={ShieldCheck}
            label={t("media.trustedView")}
            onClick={() => setWorkspaceView("trusted")}
          />
          <PublisherViewTab
            active={workspaceView === "evidence"}
            icon={History}
            label={t("media.evidenceView")}
            onClick={() => setWorkspaceView("evidence")}
          />
        </div>
        <p className="text-sm leading-6 text-slate-500">
          {workspaceView === "readiness"
            ? t("media.readinessViewDescription")
            : workspaceView === "trusted"
              ? t("media.trustedViewDescription")
              : t("media.evidenceViewDescription")}
        </p>
      </div>

      {workspaceView === "readiness" ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <NextActionBar
              heading={t("media.publisherDecision")}
              status={stateLabels[overallState]}
              statusTone={overallState === "complete" ? "success" : overallState === "blocked" ? "danger" : "info"}
              nextActionLabel={t("media.nextAction")}
              nextAction={primaryAction ? actionLabels[primaryAction] : t("media.readinessComplete")}
              ownerLabel={t("media.owner")}
              owner={getRoleDisplayName(ownerRole, locale)}
              blockerLabel={t("media.blocker")}
              blocker={blocker}
              dueDateLabel={t("media.dueDate")}
              dueDate={snapshot.integrationProjects[0]?.go_live_date ?? snapshot.commercialTests[0]?.end_date ?? t("media.notScheduled")}
              actionLabel={primaryAction ? actionLabels[primaryAction] : undefined}
              onAction={primaryAction ? () => runPrimaryAction(primaryAction) : undefined}
            />
          </div>

          <PublisherReadinessPath steps={readinessSteps} labels={{
            title: t("media.publisherReadiness"),
            profile: t("media.profileFoundation"),
            technical: t("media.technicalReadiness"),
            commercial: t("media.commercialValidation"),
            trusted: t("media.trustedQualification"),
            supply: t("media.activeSupply"),
            complete: t("media.stateComplete"),
            active: t("media.stateActive"),
            blocked: t("media.stateBlocked"),
            pending: t("media.statePending")
          }} />

          <MetricStrip
            label={t("media.profileOverview")}
            items={[
              { label: "DAU", value: publisher.daily_active_users?.toLocaleString() ?? "-" },
              { label: t("media.dailyRequests"), value: publisher.daily_requests?.toLocaleString() ?? "-" },
              { label: t("media.risk"), value: getPublisherRiskLabel(publisher.risk_level, locale), tone: publisher.risk_level === "high" || publisher.risk_level === "critical" ? "danger" : "neutral" },
              { label: t("media.blockers"), value: String(snapshot.diagnosticCases.filter((item) => item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)).length) }
            ]}
          />

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">{t("media.profileOverview")}</h2>
            </div>
            <div className="grid md:grid-cols-2">
              <ReadinessEvidenceList
                title={t("media.assetIdentity")}
                items={[
                  publisher.legal_entity ? `${t("media.onboardingLegalEntity")}: ${publisher.legal_entity}` : undefined,
                  publisher.metadata?.property_name ? `${t("media.onboardingPropertyName")}: ${publisher.metadata.property_name}` : undefined,
                  publisher.metadata?.property_identifier
                    ? `${t("media.onboardingIdentifierType")}: ${publisher.metadata.property_identifier_type ?? "-"} / ${publisher.metadata.property_identifier}`
                    : undefined
                ].filter((item): item is string => Boolean(item))}
                empty={t("media.noDataContinue")}
              />
              <ReadinessEvidenceList
                title={t("media.trafficEvidence")}
                items={[
                  `DAU: ${publisher.daily_active_users?.toLocaleString() ?? "-"}`,
                  `MAU: ${publisher.metadata?.monthly_active_users?.toLocaleString() ?? "-"}`,
                  `${t("media.dailyRequests")}: ${publisher.daily_requests?.toLocaleString() ?? "-"}`,
                  publisher.metadata?.traffic_data_as_of
                    ? `${t("media.onboardingDataAsOf")}: ${publisher.metadata.traffic_data_as_of} / ${publisher.metadata.traffic_source ?? "-"}`
                    : undefined
                ].filter((item): item is string => Boolean(item))}
                empty={t("media.noDataContinue")}
              />
              <ReadinessEvidenceList title={t("media.contacts")} items={snapshot.contacts.map((contact) => `${contact.name} / ${contact.role_title} / ${contact.email ?? contact.phone ?? "-"}`)} empty={t("media.noDataContinue")} />
              <ReadinessEvidenceList title={t("media.adSlots")} items={snapshot.adSlots.map((slot) => `${slot.slot_name} / ${slot.ad_format} / ${slot.placement_type} / ${slot.daily_requests?.toLocaleString() ?? "-"} / ${slot.currency ?? "CNY"} ${slot.floor_price ?? "-"}`)} empty={t("media.noDataContinue")} />
              <ReadinessEvidenceList title={t("media.commercialTerms")} items={snapshot.contractTerms.map((term) => `${term.billing_model} / ${term.payment_terms} / ${term.settlement_cycle} / ${term.currency ?? "CNY"}`)} empty={t("media.noDataContinue")} />
              <ReadinessEvidenceList title={t("media.integration")} items={snapshot.integrationProjects.map((project) => `${project.integration_type} / ${getPublisherStatusLabel(project.status, locale)}`)} empty={t("media.noDataContinue")} />
              <ReadinessEvidenceList title={t("media.commercialTest")} items={snapshot.commercialTests.map((test) => `${test.test_name} / ${getPublisherStatusLabel(test.status, locale)}`)} empty={t("media.noDataContinue")} />
            </div>
          </section>
        </>
      ) : null}

      {workspaceView === "trusted" ? (
        <TrustedSupplyPanel
          snapshot={trustedSnapshot}
          onEvaluate={onEvaluateTrust}
          onConfirmPool={onConfirmPool}
          onCreatePackage={onCreatePackage}
          onActivatePackage={onActivatePackage}
          labels={{
            title: t("trusted.title"),
            description: t("trusted.description"),
            notEvaluated: t("trusted.notEvaluated"),
            score: t("trusted.score"),
            level: t("trusted.level"),
            suggestedPool: t("trusted.suggestedPool"),
            confirmedPool: t("trusted.confirmedPool"),
            evaluate: t("trusted.evaluate"),
            confirmPool: t("trusted.confirmPool"),
            createPackage: t("trusted.createPackage"),
            activatePackage: t("trusted.activatePackage"),
            scoreBreakdown: t("trusted.scoreBreakdown"),
            reasons: t("trusted.reasons"),
            risks: t("trusted.risks"),
            noRisks: t("trusted.noRisks"),
            packages: t("trusted.packages"),
            noPackages: t("trusted.noPackages"),
            quality: t("trusted.quality"),
            scoreTrend: t("trusted.scoreTrend"),
            blockers: t("trusted.blockers"),
            nextAction: t("trusted.nextAction"),
            humanGate: t("trusted.humanGate")
          }}
        />
      ) : null}

      {workspaceView === "evidence" ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">{t("media.evidenceHistory")}</h2>
          </div>
          <div className="grid md:grid-cols-2">
            <ReadinessEvidenceList title={t("media.contacts")} items={snapshot.contacts.map((contact) => `${contact.name} / ${contact.role_title}`)} empty={t("media.noDataContinue")} />
            <ReadinessEvidenceList title={t("media.integration")} items={snapshot.integrationProjects.flatMap((project) => (project.evidence ?? []).map((evidence) => `${evidence.title} / ${evidence.reference}`))} empty={t("media.noDataContinue")} />
            <ReadinessEvidenceList title={t("media.commercialTest")} items={snapshot.commercialTests.map((test) => `${test.test_name} / ${getPublisherStatusLabel(test.status, locale)} / ${test.result_summary ?? test.next_action ?? "-"}`)} empty={t("media.noDataContinue")} />
            <ReadinessEvidenceList title={t("media.diagnostics")} items={snapshot.diagnosticCases.map((item) => `${item.case_no} / ${item.current_blocker ?? item.next_action ?? item.status}`)} empty={t("media.noDataContinue")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PublisherViewTab({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition sm:flex-none ${
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function PublisherReadinessPath({
  steps,
  labels
}: {
  steps: ReturnType<typeof getPublisherReadinessSteps>;
  labels: Record<"title" | "profile" | "technical" | "commercial" | "trusted" | "supply" | PublisherReadinessState, string>;
}) {
  const toneForState: Record<PublisherReadinessState, "success" | "info" | "danger" | "neutral"> = {
    complete: "success",
    active: "info",
    blocked: "danger",
    pending: "neutral"
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card" aria-labelledby="publisher-readiness-heading">
      <h2 id="publisher-readiness-heading" className="text-base font-semibold text-slate-950">{labels.title}</h2>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.key} className="min-w-0 border-l-2 border-slate-200 py-2 pl-3 xl:border-l-0 xl:border-t-2 xl:pt-3 xl:pl-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              <StatusBadge tone={toneForState[step.state]}>{labels[step.state]}</StatusBadge>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{labels[step.key]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ReadinessEvidenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="min-w-0 border-b border-slate-200 p-5 odd:md:border-r">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <StatusBadge tone={items.length > 0 ? "success" : "neutral"}>{String(items.length)}</StatusBadge>
      </div>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <p key={`${item}-${index}`} className="break-words border-l-2 border-slate-200 pl-3 text-sm leading-6 text-slate-600">{item}</p>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500">{empty}</p>
        )}
      </div>
    </section>
  );
}

function TrustedSupplyPanel({
  snapshot,
  onEvaluate,
  onConfirmPool,
  onCreatePackage,
  onActivatePackage,
  labels
}: {
  snapshot: ReturnType<typeof trustedSupplyNetworkService.getSnapshot>;
  onEvaluate: () => void;
  onConfirmPool: () => void;
  onCreatePackage: () => void;
  onActivatePackage: (packageId: EntityId) => void;
  labels: Record<string, string>;
}) {
  const { locale, t } = useLocale();
  const profile = snapshot.profile;
  const breakdownLabels: Record<string, string> = {
    profile_completeness: t("trusted.profileCompleteness"),
    authorization: t("trusted.authorization"),
    technical: t("trusted.technical"),
    context_signals: t("trusted.contextSignals"),
    quality_ivt: t("trusted.qualityIvt"),
    transparency: t("trusted.transparency"),
    commercial: t("trusted.commercial"),
    advertiser_fit: t("trusted.advertiserFit"),
    delivery: t("trusted.delivery"),
    risk_deduction: t("trusted.riskDeduction")
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">{labels.title}</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{labels.description}</p>
        </div>
        <StatusBadge tone={snapshot.quality.status === "healthy" ? "success" : snapshot.quality.status === "at_risk" || snapshot.quality.status === "suspended" ? "danger" : "warning"}>
          {getPublisherStatusLabel(snapshot.quality.status, locale)}
        </StatusBadge>
      </div>

      <div className="grid border-b border-slate-200 md:grid-cols-4">
        <TrustMetric label={labels.score} value={profile ? String(profile.total_score) : labels.notEvaluated} />
        <TrustMetric label={labels.level} value={profile?.trust_level ?? "-"} />
        <TrustMetric label={labels.suggestedPool} value={profile?.suggested_pool ? getPublisherStatusLabel(profile.suggested_pool, locale) : "-"} />
        <TrustMetric label={labels.confirmedPool} value={profile?.confirmed_pool ? getPublisherStatusLabel(profile.confirmed_pool, locale) : "-"} />
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{labels.scoreBreakdown}</h3>
          {profile ? (
            <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
              {Object.entries(profile.score_breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                  <span className="text-slate-600">{breakdownLabels[key] ?? key}</span>
                  <span className={`font-semibold ${key === "risk_deduction" && value > 0 ? "text-red-700" : "text-slate-900"}`}>
                    {key === "risk_deduction" ? `-${value}` : value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{labels.humanGate}</p>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <TrustList title={labels.reasons} items={profile?.recommendation_reasons ?? []} empty={labels.notEvaluated} />
            <TrustList title={labels.risks} items={profile?.risk_warnings ?? []} empty={labels.noRisks} danger />
          </div>
        </div>

        <div className="space-y-5 border-slate-200 xl:border-l xl:pl-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">{labels.quality}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">{labels.scoreTrend}</dt><dd className="mt-1 font-semibold text-slate-900">{snapshot.quality.scoreDelta >= 0 ? "+" : ""}{snapshot.quality.scoreDelta}</dd></div>
              <div><dt className="text-slate-500">{labels.blockers}</dt><dd className="mt-1 font-semibold text-slate-900">{snapshot.quality.openBlockingCases}</dd></div>
            </dl>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {snapshot.quality.signals.map((signal) => (
                <p key={signal}>{signal === "Trusted supply score has not been calculated." ? t("trusted.scoreNotCalculated") : signal}</p>
              ))}
            </div>
            <p className="mt-3 border-l-2 border-blue-500 pl-3 text-sm font-medium text-slate-700">
              {snapshot.quality.nextAction === "Run trusted supply evaluation." ? t("trusted.runEvaluation") : snapshot.quality.nextAction}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">{labels.packages}</h3>
            <div className="mt-3 space-y-2">
              {snapshot.packages.map((packageRecord) => (
                <div key={packageRecord.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{packageRecord.package_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{getPublisherStatusLabel(packageRecord.pool, locale)} / {getPublisherStatusLabel(packageRecord.status, locale)} / {packageRecord.ad_formats.join(", ")}</p>
                  </div>
                  {packageRecord.status === "draft" ? (
                    <button className="h-9 rounded-lg border border-emerald-200 px-3 text-sm font-semibold text-emerald-700" type="button" onClick={() => onActivatePackage(packageRecord.id)}>
                      {labels.activatePackage}
                    </button>
                  ) : <StatusBadge tone="success">{getPublisherStatusLabel(packageRecord.status, locale)}</StatusBadge>}
                </div>
              ))}
              {snapshot.packages.length === 0 ? <p className="text-sm text-slate-500">{labels.noPackages}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 p-5">
        <button className="h-10 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-700" type="button" onClick={onEvaluate}>
          {labels.evaluate}
        </button>
        <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" onClick={onConfirmPool} disabled={!profile || Boolean(profile.confirmed_pool)}>
          {labels.confirmPool}
        </button>
        <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300" type="button" onClick={onCreatePackage} disabled={!profile?.confirmed_pool || !["core", "test"].includes(profile.confirmed_pool)}>
          {labels.createPackage}
        </button>
        <p className="flex basis-full items-center gap-2 text-xs text-slate-500"><ShieldAlert className="size-4" aria-hidden="true" />{labels.humanGate}</p>
      </div>
    </article>
  );
}

function TrustMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-slate-200 p-4 md:not-last:border-r">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function TrustList({ title, items, empty, danger = false }: { title: string; items: string[]; empty: string; danger?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className={`mt-2 space-y-2 border-l-2 pl-3 text-sm ${danger ? "border-red-300 text-red-800" : "border-emerald-300 text-slate-600"}`}>
        {items.length ? items.map((item) => <p key={item}>{item}</p>) : <p>{empty}</p>}
      </div>
    </div>
  );
}

function IntegrationWizard({
  publisher,
  state,
  onStart,
  onRecordEvidence,
  onSetBlocker,
  onResolveBlocker,
  onSubmit
}: {
  publisher: Publisher;
  state: MediaWorkflowState;
  onStart: () => void;
  onRecordEvidence: (input: { evidenceType: IntegrationEvidenceType; title: string; reference: string }) => void;
  onSetBlocker: (blocker: string) => void;
  onResolveBlocker: () => void;
  onSubmit: () => void;
}) {
  const { locale, t } = useLocale();
  const snapshot = mediaWorkflowService.getIntegrationExecutionSnapshot(state, publisher.id);
  const project = snapshot.project;
  const [evidenceType, setEvidenceType] = useState<IntegrationEvidenceType>("connection_config");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [blocker, setBlocker] = useState("");
  const executionActive = Boolean(project && ["in_integration", "technical_review"].includes(project.status));
  const executionStartable = Boolean(project && ["draft", "pending_integration"].includes(project.status));
  const readinessPassed = project?.status === "technical_live_passed";

  function evidenceLabel(type: IntegrationEvidenceType) {
    if (type === "connection_config") return t("integration.connectionConfig");
    if (type === "test_request") return t("integration.testRequest");
    if (type === "callback_log") return t("integration.callbackLog");
    return t("integration.productionLog");
  }

  function recordEvidence() {
    onRecordEvidence({
      evidenceType,
      title: evidenceTitle || evidenceLabel(evidenceType),
      reference: evidenceReference
    });
    setEvidenceTitle("");
    setEvidenceReference("");
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="p-5">
          <p className="text-xl font-semibold text-slate-950">{t("integration.title")}</p>
          <p className="mt-1 text-sm text-slate-500">{publisher.name}</p>
        </div>
        <Wrench className="mr-5 mt-5 size-6 text-blue-600" aria-hidden="true" />
      </div>

      <div className="grid border-y border-slate-200 md:grid-cols-3">
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">{t("integration.status")}</p>
          <div className="mt-2"><StatusBadge tone={toneForStatus(project?.status ?? "pending_integration")}>{getPublisherStatusLabel(project?.status ?? "pending_integration", locale)}</StatusBadge></div>
        </div>
        <div className="border-slate-200 p-4 md:border-x">
          <p className="text-xs font-semibold text-slate-500">{t("integration.progress")}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{snapshot.completed} / {snapshot.total}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">{t("integration.nextAction")}</p>
          <p className="mt-2 text-sm leading-5 text-slate-700">{project?.next_action ?? t("integration.startExecution")}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">{t("integration.evidence")}</h2>
          <StatusBadge tone={snapshot.ready ? "success" : "warning"}>
            {snapshot.ready ? t("integration.ready") : t("integration.notReady")}
          </StatusBadge>
        </div>
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {snapshot.items.map((item) => (
            <div key={item.type} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{evidenceLabel(item.type)}</p>
                <p className="mt-1 text-xs text-slate-500">{item.evidence?.reference ?? item.checklistKey}</p>
              </div>
              <StatusBadge tone={item.done && item.evidence ? "success" : "warning"}>
                {item.done && item.evidence ? t("integration.recorded") : t("integration.required")}
              </StatusBadge>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            {t("integration.evidenceType")}
            <select
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value as IntegrationEvidenceType)}
            >
              {integrationEvidenceDefinitions.map((item) => (
                <option key={item.type} value={item.type}>{evidenceLabel(item.type)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t("integration.evidenceTitle")}
            <input
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              placeholder={evidenceLabel(evidenceType)}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          {t("integration.evidenceReference")}
          <input
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            placeholder="LOG-2026-001 / https://..."
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="h-10 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            type="button"
            onClick={onStart}
            disabled={!executionStartable}
          >
            {t("integration.startExecution")}
          </button>
          <button
            className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            onClick={recordEvidence}
            disabled={!executionActive || Boolean(project?.blocker) || !evidenceReference.trim()}
          >
            {t("integration.recordEvidence")}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-950">{t("integration.blocker")}</h2>
        {project?.blocker ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-800">{project.blocker}</p>
            <button className="h-9 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700" type="button" onClick={onResolveBlocker}>
              {t("integration.resolveBlocker")}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-emerald-700">{t("integration.noBlocker")}</p>
        )}
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
            value={blocker}
            onChange={(event) => setBlocker(event.target.value)}
            placeholder={t("integration.blockerPlaceholder")}
          />
          <button
            className="h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
            type="button"
            onClick={() => {
              onSetBlocker(blocker);
              setBlocker("");
            }}
            disabled={readinessPassed || !blocker.trim()}
          >
            {t("integration.setBlocker")}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <button
          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          onClick={onSubmit}
          disabled={!snapshot.ready || readinessPassed}
        >
          {t("integration.submitReadiness")}
        </button>
      </div>
    </article>
  );
}

function CommercialTestWorkspace({
  publisher,
  tests,
  onCreateTest,
  onPassLatestTest
}: {
  publisher: Publisher;
  tests: MediaWorkflowState["commercialTests"];
  onCreateTest: () => void;
  onPassLatestTest: () => void;
}) {
  const { locale, t } = useLocale();
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-slate-950">{t("commercial.title")}</p>
          <p className="mt-1 text-sm text-slate-500">{publisher.name} / {t("commercial.description")}</p>
        </div>
        <TestTube2 className="size-6 text-blue-600" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(tests.length ? tests : []).map((test) => (
          <div key={test.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{test.test_name}</p>
            <div className="mt-3">
              <StatusBadge tone={toneForStatus(test.status)}>{getPublisherStatusLabel(test.status, locale)}</StatusBadge>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Fill {(test.fill_rate * 100).toFixed(1)}% / Clear {(test.clear_rate * 100).toFixed(1)}% / IVT {(test.ivt_rate * 100).toFixed(1)}%
            </p>
            <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs">
              <div><dt className="text-slate-500">{t("commercial.owner")}</dt><dd className="mt-1 font-medium text-slate-800">{getRoleDisplayName(test.owner_role ?? "adops_manager", locale)}</dd></div>
              <div><dt className="text-slate-500">{t("commercial.period")}</dt><dd className="mt-1 font-medium text-slate-800">{test.start_date ?? "-"} / {test.end_date ?? "-"}</dd></div>
              <div><dt className="text-slate-500">{t("commercial.thresholds")}</dt><dd className="mt-1 leading-5 text-slate-700">Fill &gt;= {((test.test_plan?.min_fill_rate ?? 0.5) * 100).toFixed(0)}% / Clear &gt;= {((test.test_plan?.min_clear_rate ?? 0.6) * 100).toFixed(0)}% / IVT &lt;= {((test.test_plan?.max_ivt_rate ?? 0.03) * 100).toFixed(0)}%</dd></div>
              <div><dt className="text-slate-500">{t("commercial.nextAction")}</dt><dd className="mt-1 leading-5 text-slate-700">{test.next_action ?? t("commercial.defaultNextAction")}</dd></div>
            </dl>
          </div>
        ))}
        {tests.length === 0 ? <p className="text-sm text-slate-500">{t("commercial.noTests")}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onCreateTest}>
          {t("commercial.create")}
        </button>
        <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onPassLatestTest}>
          {t("commercial.submit")}
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DetailPanel({
  title,
  items,
  action,
  onAction
}: {
  title: string;
  items: string[];
  action: string;
  onAction: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <button className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700" type="button" onClick={onAction}>
          {action}
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {item}
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No data yet. Add the next item to continue readiness.</p>
        )}
      </div>
    </article>
  );
}
