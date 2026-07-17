import { describe, expect, it } from "vitest";
import { LocalWorkflowRepository } from "./localWorkflowRepository";
import { SupabaseWorkflowRepository, type SupabaseLike } from "./supabaseWorkflowRepository";
import { createFixtureWorkflowSnapshot } from "./workflowRepository";

type Row = Record<string, unknown>;

class FakeSupabase implements SupabaseLike {
  readonly writes: Record<string, Row[]> = {};
  readonly writeCalls: Array<{ table: string; rows: Row[] }> = [];

  constructor(
    private readonly tables: Record<string, Row[]> = {},
    private readonly failingTables = new Set<string>()
  ) {}

  from(table: string) {
    return {
      select: async () => {
        if (this.failingTables.has(table)) {
          return { data: null, error: { message: `${table} blocked` } };
        }

        return { data: this.tables[table] ?? [], error: null };
      },
      upsert: async (rows: Row[]) => {
        this.writes[table] = rows;
        this.writeCalls.push({ table, rows });
        return { data: rows, error: null };
      }
    };
  }
}

function uuid(index: number) {
  return `${String(index).padStart(8, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

describe("workflow repositories", () => {
  it("loads a fixture snapshot without requiring Supabase", async () => {
    const repository = new LocalWorkflowRepository();
    const result = await repository.loadSnapshot();

    expect(result.health.mode).toBe("fixture");
    expect(result.snapshot.mediaState.publishers.length).toBeGreaterThan(0);
    expect(result.snapshot.salesState.proposals.length).toBeGreaterThan(0);
    expect(result.snapshot.workbenchState.okrObjectives.length).toBeGreaterThan(0);
  });

  it("maps Supabase tables into the Phase 4-10 workflow snapshot", async () => {
    const publisherId = uuid(1);
    const advertiserId = uuid(2);
    const opportunityId = uuid(3);
    const proposalId = uuid(4);
    const selectionId = uuid(5);
    const campaignId = uuid(6);
    const allocationId = uuid(7);
    const diagnosticCaseId = uuid(8);
    const evidenceId = uuid(9);
    const settlementId = uuid(10);
    const contractId = uuid(11);
    const sopId = uuid(12);
    const workItemId = uuid(13);
    const objectiveId = uuid(14);
    const keyResultId = uuid(15);
    const ecosystemLeadId = uuid(16);
    const outreachId = uuid(17);
    const trustedCandidateId = uuid(18);
    const trustProfileId = uuid(20);
    const trustHistoryId = uuid(21);
    const supplyPackageId = uuid(22);

    const fakeSupabase = new FakeSupabase({
      publishers: [
        {
          id: publisherId,
          name: "DB Publisher",
          region: "CN",
          media_type: "CTV",
          integration_type: "VAST",
          technical_live_status: "technical_live_passed",
          commercial_test_status: "test_passed",
          sales_scale_status: "scale_ready",
          risk_level: "medium",
          daily_requests: 1000
        }
      ],
      commercial_tests: [
        {
          id: uuid(19),
          publisher_id: publisherId,
          test_name: "DB test",
          status: "test_passed",
          target_budget: "1200",
          metrics: { spend: 1100, fill_rate: 0.61, clear_rate: 0.72, ivt_rate: 0.01 }
        }
      ],
      media_trust_profiles: [
        {
          id: trustProfileId,
          publisher_id: publisherId,
          status: "confirmed",
          total_score: 82,
          trust_level: "A",
          score_breakdown: { technical: 15, risk_deduction: 4 },
          suggested_pool: "core",
          confirmed_pool: "core",
          advertiser_fit_tags: ["wellness"],
          recommendation_reasons: ["Production verified"],
          risk_warnings: ["Medium risk"],
          owner_role: "media_director",
          next_action: "Create package",
          evaluated_at: "2026-07-17T08:00:00.000Z"
        }
      ],
      media_trust_score_history: [
        {
          id: trustHistoryId,
          publisher_id: publisherId,
          total_score: 82,
          trust_level: "A",
          score_breakdown: { technical: 15, risk_deduction: 4 },
          suggested_pool: "core",
          reasons: ["Production verified"],
          risk_warnings: ["Medium risk"],
          calculated_at: "2026-07-17T08:00:00.000Z",
          calculated_by_role: "media_manager"
        }
      ],
      media_supply_packages: [
        {
          id: supplyPackageId,
          publisher_id: publisherId,
          package_name: "DB controlled supply",
          status: "active",
          pool: "core",
          ad_formats: ["Video"],
          placement_types: ["In-app"],
          geo: "CN",
          inventory_scale: 1000,
          floor_price: 12,
          billing_model: "CPM",
          advertiser_fit_tags: ["wellness"],
          risk_notes: [],
          owner_role: "media_manager",
          created_at: "2026-07-17T08:00:00.000Z",
          updated_at: "2026-07-17T08:00:00.000Z",
          activated_at: "2026-07-17T08:05:00.000Z"
        }
      ],
      media_ecosystem_opportunities: [
        {
          id: ecosystemLeadId,
          media_name: "DB Ecosystem Media",
          company_entity: "DB Media Group",
          ecosystem_segment: "SHORT_VIDEO_LIVE",
          ecosystem_status: "CONTACTED",
          owner_role: "media_manager",
          verification_status: "IN_REVIEW",
          data_quality_level: "MANUAL_REVIEWED",
          review_required: true,
          seed_confidence: "PARSED_TEXT",
          source_name: "China media seed",
          source_version: "2024-7",
          strategic_segment_score: 18,
          user_scale_score: 14,
          ad_context_score: 13,
          integration_feasibility_score: 10,
          advertiser_demand_score: 12,
          commercial_feasibility_score: 8,
          risk_control_score: 6,
          priority_score: 81,
          priority_score_reason: "Strong brand demand and short-video inventory fit.",
          integration_feasibility: "needs_work",
          media_contact_confirmed: true,
          business_interest_confirmed: false,
          ad_inventory_identified: true,
          media_director_approved_by: uuid(17),
          media_director_approved_at: "2026-07-10T08:05:00.000Z",
          next_action: "Confirm business interest",
          metadata: { region: "CN", risk_level: "medium", user_scale_note: "DAU confirmed by operator" }
        }
      ],
      media_ecosystem_outreach_activities: [
        {
          id: outreachId,
          opportunity_id: ecosystemLeadId,
          event: "contacted",
          actor_role: "media_manager",
          activity_at: "2026-07-10T08:00:00.000Z",
          notes: "Initial outreach recorded."
        }
      ],
      trusted_supply_candidates: [
        {
          id: trustedCandidateId,
          opportunity_id: ecosystemLeadId,
          media_name: "DB Ecosystem Media",
          track: "SHORT_VIDEO_LIVE",
          priority_score: 81,
          status: "onboarding_ready",
          owner_user_id: uuid(17),
          owner_role: "media_manager",
          evaluation_notes: "Candidate entered network evaluation.",
          readiness_started_at: "2026-07-10T08:11:00.000Z",
          technical_reviewed_at: "2026-07-10T08:12:00.000Z",
          commercial_reviewed_at: "2026-07-10T08:13:00.000Z",
          onboarding_ready_at: "2026-07-10T08:13:00.000Z",
          readiness_notes: "Ready for onboarding project.",
          created_at: "2026-07-10T08:10:00.000Z"
        }
      ],
      advertisers: [{ id: advertiserId, name: "DB Advertiser", industry: "Fitness", region: "CN", status: "active" }],
      opportunities: [
        {
          id: opportunityId,
          advertiser_id: advertiserId,
          name: "DB Opportunity",
          stage: "proposal_drafting",
          expected_budget: 5000,
          pain_points: ["scale"]
        }
      ],
      proposals: [{ id: proposalId, opportunity_id: opportunityId, name: "DB Proposal", status: "internal_review", budget: 5000 }],
      proposal_media_selections: [
        {
          id: selectionId,
          proposal_id: proposalId,
          publisher_id: publisherId,
          guard_status: "allowed",
          planned_budget: 2000
        }
      ],
      campaigns: [
        {
          id: campaignId,
          proposal_id: proposalId,
          advertiser_id: advertiserId,
          name: "DB Campaign",
          status: "pending_approval",
          launch_check: { passed: true }
        }
      ],
      campaign_media_allocations: [
        {
          id: allocationId,
          campaign_id: campaignId,
          publisher_id: publisherId,
          guard_status: "allowed",
          allocation_budget: 2000
        }
      ],
      quality_diagnostic_cases: [
        {
          id: diagnosticCaseId,
          case_no: "DC-DB",
          case_type: "quality_drop",
          publisher_id: publisherId,
          status: "opened",
          severity: "high",
          owner_role: "data_analyst",
          is_blocking_sales_scale: true,
          is_blocking_settlement: false,
          metadata: { current_blocker: "Investigating", next_action: "Collect evidence" }
        }
      ],
      quality_diagnostic_evidence: [
        {
          id: evidenceId,
          case_id: diagnosticCaseId,
          title: "Funnel",
          evidence_type: "funnel_metric",
          content: "Metric snapshot",
          data: { metric_name: "fill_rate", baseline_value: 0.8, current_value: 0.4, status: "collected" }
        }
      ],
      settlements: [
        {
          id: settlementId,
          campaign_id: campaignId,
          publisher_id: publisherId,
          status: "pending_review",
          amount: 3000,
          currency: "USD",
          metadata: { reconciliationCompleted: true, payable_amount: 2900 }
        }
      ],
      contracts: [
        {
          id: contractId,
          object_type: "publisher",
          object_id: publisherId,
          contract_name: "CON-DB",
          counterparty: "DB Publisher",
          status: "legal_review",
          metadata: {
            contract_no: "CON-DB",
            contract_type: "publisher_framework",
            owner_role: "legal_manager",
            requested_by_role: "operations_director",
            risk_level: "high",
            next_action: "Legal review"
          }
        }
      ],
      sop_cards: [
        {
          id: sopId,
          title: "DB SOP",
          scenario: "Launch",
          role_code: "product_owner",
          content: "Step 1",
          related_route: "/guide",
          updated_at: "2026-06-29T00:00:00.000Z",
          metadata: {
            module: "Guide",
            visible_roles: ["product_owner"],
            status: "published",
            priority: "P0",
            summary: "DB SOP summary",
            steps: ["Step 1"],
            version: 2
          }
        }
      ],
      work_items: [
        {
          id: workItemId,
          title: "DB Work Item",
          object_type: "campaign",
          object_id: campaignId,
          owner_role: "operations_director",
          status: "open",
          priority: "high",
          metadata: { module: "Campaigns", related_route: "/campaigns/:id/wizard", next_action: "Approve launch" }
        }
      ],
      okr_objectives: [{ id: objectiveId, title: "DB OKR", owner_role: "operations_director", period: "2026-Q3", status: "active" }],
      okr_key_results: [
        {
          id: keyResultId,
          objective_id: objectiveId,
          title: "Ready publishers",
          target_value: 10,
          current_value: 8,
          unit: "publishers"
        }
      ]
    });

    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const result = await repository.loadSnapshot();

    expect(result.health).toMatchObject({ mode: "supabase", source: "supabase" });
    expect(result.snapshot.mediaState.publishers[0]).toMatchObject({ id: publisherId, name: "DB Publisher" });
    expect(result.snapshot.mediaState.commercialTests[0]).toMatchObject({ fill_rate: 0.61, spend: 1100 });
    expect(result.snapshot.mediaState.mediaTrustProfiles[0]).toMatchObject({
      id: trustProfileId,
      total_score: 82,
      confirmed_pool: "core"
    });
    expect(result.snapshot.mediaState.mediaTrustScoreHistory[0]).toMatchObject({ id: trustHistoryId, trust_level: "A" });
    expect(result.snapshot.mediaState.mediaSupplyPackages[0]).toMatchObject({ id: supplyPackageId, status: "active" });
    expect(result.snapshot.mediaState.mediaEcosystemLeads[0]).toMatchObject({
      id: ecosystemLeadId,
      media_name: "DB Ecosystem Media",
      track: "SHORT_VIDEO_LIVE",
      stage: "CONTACTED",
      priority_score: 81,
      media_contact_confirmed: true,
      media_director_approved_at: "2026-07-10T08:05:00.000Z",
      verification_status: "IN_REVIEW",
      data_quality_level: "MANUAL_REVIEWED",
      review_required: true
    });
    expect(result.snapshot.mediaState.mediaOutreachActivities[0]).toMatchObject({
      id: outreachId,
      lead_id: ecosystemLeadId,
      event: "contacted"
    });
    expect(result.snapshot.mediaState.trustedSupplyCandidates[0]).toMatchObject({
      id: trustedCandidateId,
      lead_id: ecosystemLeadId,
      owner_user_id: uuid(17),
      status: "onboarding_ready",
      readiness_started_at: "2026-07-10T08:11:00.000Z",
      technical_reviewed_at: "2026-07-10T08:12:00.000Z",
      commercial_reviewed_at: "2026-07-10T08:13:00.000Z",
      onboarding_ready_at: "2026-07-10T08:13:00.000Z",
      readiness_notes: "Ready for onboarding project."
    });
    expect(result.snapshot.salesState.proposals[0].selectedPublisherIds).toEqual([publisherId]);
    expect(result.snapshot.salesState.campaigns[0]).toMatchObject({ publisherIds: [publisherId], launchChecklistPassed: true });
    expect(result.snapshot.mediaState.diagnosticEvidence[0]).toMatchObject({ diagnostic_case_id: diagnosticCaseId, metric_name: "fill_rate" });
    expect(result.snapshot.financeState.settlements[0]).toMatchObject({ reconciliationCompleted: true, payable_amount: 2900 });
    expect(result.snapshot.contractState.contracts[0]).toMatchObject({ contract_no: "CON-DB", publisher_id: publisherId });
    expect(result.snapshot.guideState.sopCards[0]).toMatchObject({ steps: ["Step 1"], version: 2 });
    expect(result.snapshot.workbenchState.tasks[0]).toMatchObject({ priority: "P0", source_object_id: campaignId });
    expect(result.snapshot.workbenchState.okrObjectives[0]).toMatchObject({
      target_value: 10,
      current_value: 8,
      status: "on_track"
    });
  });

  it("falls back per table when a Supabase read fails", async () => {
    const repository = new SupabaseWorkflowRepository(new FakeSupabase({}, new Set(["publishers"])));
    const result = await repository.loadSnapshot();

    expect(result.health.source).toBe("supabase-with-fallback");
    expect(result.health.warnings[0]).toContain("publishers");
    expect(result.snapshot.mediaState.publishers.length).toBeGreaterThan(0);
  });

  it("saves UUID-backed rows and skips fixture-only slug ids", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const snapshot = createFixtureWorkflowSnapshot();
    const publisherId = uuid(30);
    const advertiserId = uuid(31);
    const opportunityId = uuid(32);
    const proposalId = uuid(33);
    const selectionId = uuid(34);
    const ecosystemLeadId = uuid(35);
    const outreachId = uuid(36);
    const trustedCandidateId = uuid(37);

    snapshot.mediaState.publishers = [
      snapshot.mediaState.publishers[0],
      {
        ...snapshot.mediaState.publishers[0],
        id: publisherId,
        name: "UUID Publisher"
      }
    ];
    snapshot.salesState.advertisers = [
      {
        ...snapshot.salesState.advertisers[0],
        id: advertiserId
      }
    ];
    snapshot.salesState.opportunities = [
      {
        ...snapshot.salesState.opportunities[0],
        id: opportunityId,
        advertiser_id: advertiserId
      }
    ];
    snapshot.salesState.proposals = [
      {
        ...snapshot.salesState.proposals[0],
        id: proposalId,
        opportunity_id: opportunityId,
        selectedPublisherIds: [publisherId]
      }
    ];
    snapshot.salesState.proposalMediaSelections = [
      {
        ...snapshot.salesState.proposalMediaSelections[0],
        id: selectionId,
        proposal_id: proposalId,
        publisher_id: publisherId
      }
    ];
    snapshot.mediaState.mediaEcosystemLeads = [
      snapshot.mediaState.mediaEcosystemLeads[0],
      {
        ...snapshot.mediaState.mediaEcosystemLeads[0],
        id: ecosystemLeadId,
        media_name: "UUID Ecosystem Media",
        stage: "PRIORITY_SCREENED",
        verification_status: "IN_REVIEW",
        data_quality_level: "MANUAL_REVIEWED",
        review_required: false,
        media_director_approved_by: uuid(38),
        media_director_approved_at: "2026-07-10T08:55:00.000Z",
        priority_score: 75,
        score_breakdown: {
          strategic_value: 18,
          user_scale_growth: 12,
          ad_scenario_value: 12,
          programmatic_feasibility: 11,
          advertiser_demand_match: 12,
          commercial_negotiability: 5,
          risk_compliance_control: 5
        }
      }
    ];
    snapshot.mediaState.mediaOutreachActivities = [
      {
        ...snapshot.mediaState.mediaOutreachActivities[0],
        id: outreachId,
        lead_id: ecosystemLeadId,
        event: "priority_screened"
      }
    ];
    snapshot.mediaState.trustedSupplyCandidates = [
      {
        id: trustedCandidateId,
        lead_id: ecosystemLeadId,
        media_name: "UUID Ecosystem Media",
        track: "SOCIAL_COMMUNITY",
        priority_score: 75,
        status: "onboarding_ready",
        owner_user_id: uuid(38),
        owner_role: "media_manager",
        created_at: "2026-07-10T09:00:00.000Z",
        evaluation_notes: "Entered trusted supply network evaluation.",
        readiness_started_at: "2026-07-10T09:05:00.000Z",
        technical_reviewed_at: "2026-07-10T09:10:00.000Z",
        commercial_reviewed_at: "2026-07-10T09:15:00.000Z",
        onboarding_ready_at: "2026-07-10T09:15:00.000Z",
        readiness_notes: "Ready for onboarding project."
      }
    ];

    const result = await repository.saveSnapshot(snapshot);

    expect(result.savedTables).toContain("publishers");
    expect(result.savedTables).toContain("proposals");
    expect(result.savedTables).toContain("media_ecosystem_opportunities");
    expect(result.savedTables).toContain("media_ecosystem_outreach_activities");
    expect(result.savedTables).toContain("trusted_supply_candidates");
    expect(fakeSupabase.writes.publishers).toEqual([
      expect.objectContaining({ id: publisherId, name: "UUID Publisher" })
    ]);
    expect(fakeSupabase.writes.media_ecosystem_opportunities).toEqual([
      expect.objectContaining({
        id: ecosystemLeadId,
        media_name: "UUID Ecosystem Media",
        ecosystem_status: "PRIORITY_SCREENED",
        priority_level: "B",
        verification_status: "IN_REVIEW",
        data_quality_level: "MANUAL_REVIEWED",
        review_required: false,
        media_director_approved_by: uuid(38),
        media_director_approved_at: "2026-07-10T08:55:00.000Z"
      })
    ]);
    expect(fakeSupabase.writes.media_ecosystem_outreach_activities).toEqual([
      expect.objectContaining({
        id: outreachId,
        opportunity_id: ecosystemLeadId,
        event: "priority_screened"
      })
    ]);
    expect(fakeSupabase.writes.trusted_supply_candidates).toEqual([
      expect.objectContaining({
        id: trustedCandidateId,
        opportunity_id: ecosystemLeadId,
        media_name: "UUID Ecosystem Media",
        owner_user_id: uuid(38),
        status: "onboarding_ready",
        readiness_started_at: "2026-07-10T09:05:00.000Z",
        technical_reviewed_at: "2026-07-10T09:10:00.000Z",
        commercial_reviewed_at: "2026-07-10T09:15:00.000Z",
        onboarding_ready_at: "2026-07-10T09:15:00.000Z",
        readiness_notes: "Ready for onboarding project."
      })
    ]);
    expect(fakeSupabase.writes.proposals).toEqual([
      expect.objectContaining({
        id: proposalId,
        metadata: { selectedPublisherIds: [publisherId] }
      })
    ]);
    expect(result.skippedWrites.some((write) => write.id === "publisher-233")).toBe(true);
  });

  it("binds Supabase writes to the authenticated actor audit fields", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const snapshot = createFixtureWorkflowSnapshot();
    const actorId = uuid(40);
    const publisherId = uuid(41);
    const auditEventId = uuid(42);
    const businessEventId = uuid(43);

    snapshot.mediaState.publishers = [
      {
        ...snapshot.mediaState.publishers[0],
        id: publisherId,
        name: "Actor Publisher"
      }
    ];
    snapshot.mediaState.auditEvents = [
      {
        id: auditEventId,
        actorUserId: "mock-media-manager",
        action: "publisher.created",
        objectType: "publisher",
        objectId: publisherId,
        allowed: true,
        reasonCode: "TEST_ACTOR_BINDING",
        createdAt: "2026-06-29T00:00:00.000Z"
      }
    ];
    snapshot.mediaState.businessEvents = [
      {
        id: businessEventId,
        eventCode: "publisher.created",
        objectType: "publisher",
        objectId: publisherId,
        ownerRole: "media_manager",
        createdAt: "2026-06-29T00:00:00.000Z",
        payload: {}
      }
    ];

    await repository.saveSnapshot(snapshot, {
      actor: {
        id: actorId,
        activeRole: "media_manager"
      }
    });

    expect(fakeSupabase.writes.publishers).toEqual([
      expect.objectContaining({
        id: publisherId,
        owner_user_id: actorId,
        created_by: actorId,
        updated_by: actorId
      })
    ]);
    expect(fakeSupabase.writes.audit_logs).toEqual([
      expect.objectContaining({
        id: auditEventId,
        actor_user_id: actorId
      })
    ]);
    expect(fakeSupabase.writes.module_business_events).toEqual([
      expect.objectContaining({
        id: businessEventId,
        owner_user_id: actorId
      })
    ]);
  });

  it("dirty saves only changed rows after a loaded Supabase baseline", async () => {
    const existingPublisherId = uuid(60);
    const newPublisherId = uuid(61);
    const advertiserId = uuid(62);
    const fakeSupabase = new FakeSupabase({
      publishers: [
        {
          id: existingPublisherId,
          name: "Existing Publisher",
          region: "CN",
          media_type: "App",
          integration_type: "SDK",
          technical_live_status: "draft",
          commercial_test_status: "not_started",
          sales_scale_status: "not_allowed",
          risk_level: "medium"
        }
      ],
      advertisers: [
        {
          id: advertiserId,
          name: "Existing Advertiser",
          industry: "Retail",
          region: "CN",
          status: "active"
        }
      ]
    });
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const { snapshot } = await repository.loadSnapshot();

    snapshot.mediaState.publishers = [
      ...snapshot.mediaState.publishers,
      {
        ...snapshot.mediaState.publishers[0],
        id: newPublisherId,
        name: "New Dirty Publisher"
      }
    ];

    const result = await repository.saveSnapshot(snapshot, {
      actor: {
        id: uuid(63),
        activeRole: "media_manager"
      }
    });

    expect(result.savedTables).toEqual(["publishers"]);
    expect(fakeSupabase.writes.publishers).toEqual([
      expect.objectContaining({
        id: newPublisherId,
        name: "New Dirty Publisher"
      })
    ]);
    expect(fakeSupabase.writes.advertisers).toBeUndefined();
  });

  it("lets the commercial-test trigger synchronize publisher readiness for AdOps", async () => {
    const publisherId = uuid(64);
    const testId = uuid(65);
    const fakeSupabase = new FakeSupabase({
      publishers: [
        {
          id: publisherId,
          name: "Commercial Sync Publisher",
          technical_live_status: "technical_live_passed",
          commercial_test_status: "testing",
          sales_scale_status: "limited_sellable",
          risk_level: "medium"
        }
      ],
      commercial_tests: [
        {
          id: testId,
          publisher_id: publisherId,
          test_name: "Controlled test",
          status: "testing",
          metrics: {}
        }
      ]
    });
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const { snapshot } = await repository.loadSnapshot();

    snapshot.mediaState.publishers[0].commercial_test_status = "test_passed";
    snapshot.mediaState.commercialTests[0].status = "test_passed";

    const result = await repository.saveSnapshot(snapshot, {
      actor: { id: uuid(66), activeRole: "adops_manager" }
    });

    expect(result.savedTables).toContain("commercial_tests");
    expect(result.savedTables).not.toContain("publishers");
    expect(fakeSupabase.writes.publishers).toBeUndefined();
    expect(result.skippedWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "publishers",
          id: publisherId,
          reason: expect.stringContaining("database trigger")
        })
      ])
    );
  });

  it("round-trips CM-5D integration evidence, blocker, and readiness fields", async () => {
    const publisherId = uuid(64);
    const projectId = uuid(65);
    const evidenceId = uuid(66);
    const fakeSupabase = new FakeSupabase({
      publishers: [
        {
          id: publisherId,
          name: "Integration Publisher",
          technical_live_status: "in_integration",
          commercial_test_status: "not_started",
          sales_scale_status: "not_allowed",
          risk_level: "medium"
        }
      ],
      integration_projects: [
        {
          id: projectId,
          publisher_id: publisherId,
          integration_type: "API",
          status: "in_integration",
          checklist: { connection_config_received: true },
          evidence: [
            {
              id: evidenceId,
              evidence_type: "connection_config",
              title: "API credentials",
              reference: "VAULT-001",
              recorded_at: "2026-07-16T01:00:00.000Z",
              recorded_by_user_id: uuid(67),
              recorded_by_role: "integration_manager"
            }
          ],
          blocker: "Waiting allowlist",
          next_action: "Resolve allowlist blocker.",
          go_live_date: "2026-07-20",
          notes: "CM-5D execution"
        }
      ]
    });
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const { snapshot } = await repository.loadSnapshot();
    const project = snapshot.mediaState.integrationProjects[0];

    expect(project).toMatchObject({
      id: projectId,
      blocker: "Waiting allowlist",
      next_action: "Resolve allowlist blocker.",
      go_live_date: "2026-07-20"
    });
    expect(project.evidence?.[0]).toMatchObject({ evidence_type: "connection_config", reference: "VAULT-001" });

    project.blocker = undefined;
    project.next_action = "Record test request evidence.";
    const result = await repository.saveSnapshot(snapshot, {
      actor: { id: uuid(68), activeRole: "integration_manager" }
    });

    expect(result.savedTables).toContain("integration_projects");
    expect(fakeSupabase.writes.integration_projects).toEqual([
      expect.objectContaining({
        id: projectId,
        evidence: [expect.objectContaining({ id: evidenceId, reference: "VAULT-001" })],
        blocker: undefined,
        next_action: "Record test request evidence.",
        go_live_date: "2026-07-20"
      })
    ]);
  });

  it("dirty saves new business event rows without bulk audit log rewrites after a successful baseline save", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const actorId = uuid(70);
    const publisherId = uuid(71);
    const firstAuditEventId = uuid(72);
    const secondAuditEventId = uuid(73);
    const firstBusinessEventId = uuid(74);
    const secondBusinessEventId = uuid(75);
    const { snapshot } = await repository.loadSnapshot();

    snapshot.mediaState.auditEvents = [
      {
        id: firstAuditEventId,
        actorUserId: "mock-media-manager",
        action: "publisher.create",
        objectType: "publisher",
        objectId: publisherId,
        allowed: true,
        reasonCode: "PUBLISHER_CREATED",
        createdAt: "2026-07-01T00:00:00.000Z"
      }
    ];
    snapshot.mediaState.businessEvents = [
      {
        id: firstBusinessEventId,
        eventCode: "publisher.created",
        objectType: "publisher",
        objectId: publisherId,
        ownerRole: "media_manager",
        createdAt: "2026-07-01T00:00:00.000Z",
        payload: {}
      }
    ];

    await repository.saveSnapshot(snapshot, {
      actor: {
        id: actorId,
        activeRole: "media_manager"
      }
    });

    snapshot.mediaState.auditEvents = [
      {
        id: secondAuditEventId,
        actorUserId: "mock-media-manager",
        action: "publisher.technical_live.submit",
        objectType: "publisher",
        objectId: publisherId,
        allowed: true,
        reasonCode: "TECHNICAL_LIVE_PASSED",
        createdAt: "2026-07-01T00:01:00.000Z"
      },
      ...snapshot.mediaState.auditEvents
    ];
    snapshot.mediaState.businessEvents = [
      {
        id: secondBusinessEventId,
        eventCode: "publisher.technical_live_passed",
        objectType: "publisher",
        objectId: publisherId,
        ownerRole: "media_manager",
        createdAt: "2026-07-01T00:01:00.000Z",
        payload: {}
      },
      ...snapshot.mediaState.businessEvents
    ];

    await repository.saveSnapshot(snapshot, {
      actor: {
        id: actorId,
        activeRole: "media_manager"
      }
    });

    const businessWrites = fakeSupabase.writeCalls.filter((call) => call.table === "module_business_events");

    expect(fakeSupabase.writeCalls.some((call) => call.table === "audit_logs")).toBe(false);
    expect(businessWrites[businessWrites.length - 1]?.rows).toEqual([
      expect.objectContaining({
        id: secondBusinessEventId,
        event_code: "publisher.technical_live_passed"
      })
    ]);
  });

  it("enriches core business audit rows with Phase 28 coverage metadata", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const snapshot = createFixtureWorkflowSnapshot();
    const actorId = uuid(50);
    const publisherId = uuid(51);
    const proposalId = uuid(52);
    const settlementId = uuid(53);
    const contractId = uuid(54);

    snapshot.mediaState.auditEvents = [
      {
        id: uuid(55),
        actorUserId: "mock-media-manager",
        action: "publisher.create",
        objectType: "publisher",
        objectId: publisherId,
        allowed: true,
        reasonCode: "PUBLISHER_CREATED",
        createdAt: "2026-07-01T00:00:00.000Z"
      }
    ];
    snapshot.salesState.auditEvents = [
      {
        id: uuid(56),
        actorUserId: "mock-sales-director",
        action: "proposal.approve",
        objectType: "proposal",
        objectId: proposalId,
        allowed: true,
        reasonCode: "PROPOSAL_APPROVED",
        createdAt: "2026-07-01T00:01:00.000Z"
      }
    ];
    snapshot.financeState.auditEvents = [
      {
        id: uuid(57),
        actorUserId: "mock-finance-manager",
        action: "settlement.confirm",
        objectType: "settlement",
        objectId: settlementId,
        allowed: true,
        reasonCode: "SETTLEMENT_CONFIRMED",
        createdAt: "2026-07-01T00:02:00.000Z"
      }
    ];
    snapshot.contractState.auditEvents = [
      {
        id: uuid(58),
        actorUserId: "mock-legal-manager",
        action: "contract.sign",
        objectType: "contract",
        objectId: contractId,
        allowed: true,
        reasonCode: "CONTRACT_SIGNED",
        createdAt: "2026-07-01T00:03:00.000Z"
      }
    ];

    await repository.saveSnapshot(snapshot, {
      actor: {
        id: actorId,
        activeRole: "ceo"
      }
    });

    expect(fakeSupabase.writes.audit_logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "publisher.create",
          object_type: "publisher",
          after_data: expect.objectContaining({
            actorRole: "ceo",
            businessAuditCoverage: "phase28_core_business_action",
            businessModule: "Media",
            workflowAction: "publisher.create"
          })
        }),
        expect.objectContaining({
          action: "proposal.approve",
          object_type: "proposal",
          after_data: expect.objectContaining({
            businessModule: "Sales",
            workflowAction: "proposal.approve"
          })
        }),
        expect.objectContaining({
          action: "settlement.confirm",
          object_type: "settlement",
          after_data: expect.objectContaining({
            businessModule: "Finance",
            workflowAction: "settlement.confirm"
          })
        }),
        expect.objectContaining({
          action: "contract.sign",
          object_type: "contract",
          after_data: expect.objectContaining({
            businessModule: "Contracts",
            workflowAction: "contract.sign"
          })
        })
      ])
    );
  });

  it("does not write audit foreign keys for mock non-UUID actors", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = new SupabaseWorkflowRepository(fakeSupabase);
    const snapshot = createFixtureWorkflowSnapshot();
    const publisherId = uuid(44);

    snapshot.mediaState.publishers = [
      {
        ...snapshot.mediaState.publishers[0],
        id: publisherId,
        name: "Mock Actor Publisher"
      }
    ];

    await repository.saveSnapshot(snapshot, {
      actor: {
        id: "mock-media-manager",
        activeRole: "media_manager"
      }
    });

    expect(fakeSupabase.writes.publishers).toEqual([
      expect.not.objectContaining({
        owner_user_id: expect.any(String)
      })
    ]);
  });
});
