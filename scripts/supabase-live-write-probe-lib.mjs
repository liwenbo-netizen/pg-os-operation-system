import { randomUUID } from "node:crypto";
import {
  buildBootstrapPlan,
  formatSupabaseError,
  getSupabaseAnonKey,
  getSupabaseUrl
} from "./supabase-uat-auth-lib.mjs";

export const liveWriteProbeRequiredRoles = [
  "sales_manager",
  "media_manager",
  "integration_manager",
  "data_analyst",
  "finance_manager",
  "legal_manager",
  "audit_viewer"
];

const probeChecks = [
  {
    id: "sales_chain",
    label: "sales_manager writes advertisers, opportunities, and proposals",
    roles: ["sales_manager"],
    tables: ["advertisers", "opportunities", "proposals"],
    expected: "allowed"
  },
  {
    id: "media_publisher",
    label: "media_manager writes publishers with actor fields",
    roles: ["media_manager"],
    tables: ["publishers"],
    expected: "allowed"
  },
  {
    id: "integration_project",
    label: "integration_manager writes publishers and integration_projects",
    roles: ["integration_manager"],
    tables: ["publishers", "integration_projects"],
    expected: "allowed"
  },
  {
    id: "commercial_test",
    label: "data_analyst writes commercial_tests against an integration fixture publisher",
    roles: ["integration_manager", "data_analyst"],
    tables: ["publishers", "commercial_tests"],
    expected: "allowed"
  },
  {
    id: "diagnostics",
    label: "data_analyst writes diagnostic cases and evidence",
    roles: ["data_analyst"],
    tables: ["quality_diagnostic_cases", "quality_diagnostic_evidence"],
    expected: "allowed"
  },
  {
    id: "finance_settlement",
    label: "finance_manager writes settlements",
    roles: ["finance_manager"],
    tables: ["settlements"],
    expected: "allowed"
  },
  {
    id: "legal_contract",
    label: "legal_manager writes contracts",
    roles: ["legal_manager"],
    tables: ["contracts"],
    expected: "allowed",
    migration: "supabase/migrations/202606290005_contracts_write_policy.sql"
  },
  {
    id: "audit_viewer_blocked",
    label: "audit_viewer is blocked from business writes",
    roles: ["audit_viewer"],
    tables: ["publishers", "advertisers"],
    expected: "blocked"
  }
];

function byPrimaryRole(users) {
  return new Map(users.map((user) => [user.primaryRole, user]));
}

export function buildLiveWriteProbePlan(env = {}, args = {}) {
  const selectedRoles = args.roles ?? liveWriteProbeRequiredRoles;
  const bootstrapPlan = buildBootstrapPlan(env, { roles: selectedRoles });
  const usersByRole = byPrimaryRole(bootstrapPlan.users);

  return {
    supabaseUrl: getSupabaseUrl(env),
    anonKeyConfigured: Boolean(getSupabaseAnonKey(env)),
    unknownRoles: bootstrapPlan.unknownRoles,
    usersByRole,
    checks: probeChecks
      .filter((check) => check.roles.every((role) => usersByRole.has(role)))
      .map((check) => ({
        ...check,
        users: check.roles.map((role) => usersByRole.get(role))
      }))
  };
}

export function validateLiveWriteProbePlan(plan, { live = false } = {}) {
  const failures = [];

  if (plan.unknownRoles.length > 0) {
    failures.push(`Unknown role(s): ${plan.unknownRoles.join(", ")}`);
  }

  if (live && !plan.supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }

  if (live && !plan.anonKeyConfigured) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  }

  const missingRoles = liveWriteProbeRequiredRoles.filter((role) => !plan.usersByRole.has(role));
  if (missingRoles.length > 0) {
    failures.push(`Missing UAT probe role(s): ${missingRoles.join(", ")}`);
  }

  const missingPasswords = Array.from(plan.usersByRole.values()).filter((user) => !user.password);
  if (live && missingPasswords.length > 0) {
    failures.push(
      `Missing password for ${missingPasswords.map((user) => user.email).join(", ")}. Set PGOS_UAT_DEFAULT_PASSWORD or per-role password env.`
    );
  }

  return failures;
}

export function describeLiveWriteProbePlan(plan) {
  return {
    supabaseUrlConfigured: Boolean(plan.supabaseUrl),
    anonKeyConfigured: plan.anonKeyConfigured,
    checks: plan.checks.map((check) => ({
      id: check.id,
      label: check.label,
      roles: check.roles,
      tables: check.tables,
      expected: check.expected,
      migration: check.migration
    }))
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function traceName(traceId, label) {
  return `UAT ${label} ${traceId}`;
}

function assertActorFields(table, row, actorUserId, fields) {
  const mismatches = fields.filter((field) => row[field] !== actorUserId);
  if (mismatches.length > 0) {
    throw new Error(`${table} actor field mismatch: ${mismatches.join(", ")}`);
  }
}

async function signInRole(context, role) {
  if (context.sessions.has(role)) {
    return context.sessions.get(role);
  }

  const user = context.plan.usersByRole.get(role);
  if (!user) {
    throw new Error(`Missing UAT user for ${role}`);
  }

  const client = context.createClient(context.supabaseUrl, context.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });

  if (signIn.error || !signIn.data.user) {
    throw new Error(`${role} sign-in failed: ${signIn.error ? formatSupabaseError(signIn.error) : "no user returned"}`);
  }

  const session = {
    role,
    client,
    userId: signIn.data.user.id,
    email: user.email
  };
  context.sessions.set(role, session);
  return session;
}

async function insertAllowed(context, role, table, row, actorFields = []) {
  const session = await signInRole(context, role);
  const id = row.id ?? randomUUID();
  const payload = {
    id,
    ...row
  };

  const selectColumns = ["id", ...actorFields].join(",");
  const result = await session.client.from(table).insert(payload).select(selectColumns).maybeSingle();

  if (result.error || !result.data?.id) {
    throw new Error(`${role} insert ${table} failed: ${result.error ? formatSupabaseError(result.error) : "no id returned"}`);
  }

  assertActorFields(table, result.data, session.userId, actorFields);
  context.cleanup.push({ role, table, id: result.data.id });

  return {
    id: result.data.id,
    actorFieldsMatch: true
  };
}

async function insertBlocked(context, role, table, row) {
  const session = await signInRole(context, role);
  const id = row.id ?? randomUUID();
  const result = await session.client.from(table).insert({ id, ...row }).select("id").maybeSingle();

  if (!result.error && result.data?.id) {
    context.cleanup.push({ role, table, id: result.data.id });
    throw new Error(`${role} unexpectedly inserted ${table}`);
  }

  return {
    table,
    blocked: true
  };
}

function baseProbeMetadata(traceId, scenario, role) {
  return {
    uat_probe: true,
    trace_id: traceId,
    scenario,
    role
  };
}

async function runSalesChain(context) {
  const sales = await signInRole(context, "sales_manager");
  const advertiser = await insertAllowed(
    context,
    "sales_manager",
    "advertisers",
    {
      name: traceName(context.traceId, "Sales Advertiser"),
      industry: "UAT",
      region: "UAT",
      owner_user_id: sales.userId,
      status: "active",
      metadata: baseProbeMetadata(context.traceId, "sales_chain", "sales_manager"),
      created_by: sales.userId,
      updated_by: sales.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
  const opportunity = await insertAllowed(
    context,
    "sales_manager",
    "opportunities",
    {
      advertiser_id: advertiser.id,
      name: traceName(context.traceId, "Sales Opportunity"),
      owner_user_id: sales.userId,
      stage: "proposal_drafting",
      expected_budget: 1000,
      currency: "USD",
      pain_points: ["uat_probe"],
      metadata: baseProbeMetadata(context.traceId, "sales_chain", "sales_manager"),
      created_by: sales.userId,
      updated_by: sales.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
  await insertAllowed(
    context,
    "sales_manager",
    "proposals",
    {
      opportunity_id: opportunity.id,
      name: traceName(context.traceId, "Sales Proposal"),
      owner_user_id: sales.userId,
      status: "draft",
      budget: 1000,
      currency: "USD",
      metadata: baseProbeMetadata(context.traceId, "sales_chain", "sales_manager"),
      created_by: sales.userId,
      updated_by: sales.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
}

async function runMediaPublisher(context) {
  const media = await signInRole(context, "media_manager");
  await insertAllowed(
    context,
    "media_manager",
    "publishers",
    {
      name: traceName(context.traceId, "Media Publisher"),
      region: "UAT",
      media_type: "Probe",
      integration_type: "Probe",
      owner_user_id: media.userId,
      owner_role: "media_manager",
      technical_live_status: "draft",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed",
      risk_level: "low",
      metadata: baseProbeMetadata(context.traceId, "media_publisher", "media_manager"),
      created_by: media.userId,
      updated_by: media.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
}

async function runIntegrationProject(context) {
  const integration = await signInRole(context, "integration_manager");
  const publisher = await insertAllowed(
    context,
    "integration_manager",
    "publishers",
    {
      name: traceName(context.traceId, "Integration Publisher"),
      region: "UAT",
      media_type: "Probe",
      integration_type: "API",
      owner_user_id: integration.userId,
      owner_role: "integration_manager",
      technical_live_status: "pending_integration",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed",
      risk_level: "low",
      metadata: baseProbeMetadata(context.traceId, "integration_project", "integration_manager"),
      created_by: integration.userId,
      updated_by: integration.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
  await insertAllowed(
    context,
    "integration_manager",
    "integration_projects",
    {
      publisher_id: publisher.id,
      integration_type: "API",
      owner_user_id: integration.userId,
      status: "pending_integration",
      notes: "UAT integration probe",
      checklist: { sdk: true, api: true }
    },
    ["owner_user_id"]
  );
}

async function runCommercialTest(context) {
  const integration = await signInRole(context, "integration_manager");
  const analyst = await signInRole(context, "data_analyst");
  const publisher = await insertAllowed(
    context,
    "integration_manager",
    "publishers",
    {
      name: traceName(context.traceId, "Commercial Test Publisher"),
      region: "UAT",
      media_type: "Probe",
      integration_type: "VAST",
      owner_user_id: integration.userId,
      owner_role: "integration_manager",
      technical_live_status: "technical_live_passed",
      commercial_test_status: "ready_for_test",
      sales_scale_status: "not_allowed",
      risk_level: "low",
      metadata: baseProbeMetadata(context.traceId, "commercial_test", "integration_manager"),
      created_by: integration.userId,
      updated_by: integration.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
  await insertAllowed(
    context,
    "data_analyst",
    "commercial_tests",
    {
      publisher_id: publisher.id,
      test_name: traceName(context.traceId, "Commercial Test"),
      owner_user_id: analyst.userId,
      status: "testing",
      target_budget: 100,
      currency: "USD",
      result_summary: "UAT probe",
      metrics: { spend: 10, fill_rate: 0.8, clear_rate: 0.9, ivt_rate: 0.01 }
    },
    ["owner_user_id"]
  );
}

async function runDiagnostics(context) {
  const analyst = await signInRole(context, "data_analyst");
  const diagnosticCase = await insertAllowed(
    context,
    "data_analyst",
    "quality_diagnostic_cases",
    {
      case_no: `UAT-${context.traceId}`,
      case_type: "uat_probe",
      title: traceName(context.traceId, "Diagnostic Case"),
      owner_user_id: analyst.userId,
      owner_role: "data_analyst",
      status: "opened",
      severity: "low",
      impact_scope: "UAT probe",
      downstream_action: "Cleanup",
      is_blocking_sales_scale: false,
      is_blocking_settlement: false,
      metadata: baseProbeMetadata(context.traceId, "diagnostics", "data_analyst"),
      created_by: analyst.userId,
      updated_by: analyst.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
  await insertAllowed(
    context,
    "data_analyst",
    "quality_diagnostic_evidence",
    {
      case_id: diagnosticCase.id,
      evidence_type: "log_sample",
      title: traceName(context.traceId, "Diagnostic Evidence"),
      content: "UAT probe evidence",
      data: { status: "collected", trace_id: context.traceId },
      created_by: analyst.userId
    },
    ["created_by"]
  );
}

async function runFinanceSettlement(context) {
  const finance = await signInRole(context, "finance_manager");
  await insertAllowed(
    context,
    "finance_manager",
    "settlements",
    {
      period_start: today(),
      period_end: today(),
      status: "draft",
      amount: 12.34,
      currency: "USD",
      owner_user_id: finance.userId,
      metadata: baseProbeMetadata(context.traceId, "finance_settlement", "finance_manager"),
      created_by: finance.userId,
      updated_by: finance.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
}

async function runLegalContract(context) {
  const legal = await signInRole(context, "legal_manager");
  await insertAllowed(
    context,
    "legal_manager",
    "contracts",
    {
      object_type: "contract",
      contract_name: traceName(context.traceId, "Legal Contract"),
      counterparty: "UAT Counterparty",
      owner_user_id: legal.userId,
      status: "draft",
      effective_date: today(),
      expiry_date: today(),
      metadata: {
        ...baseProbeMetadata(context.traceId, "legal_contract", "legal_manager"),
        contract_no: `UAT-${context.traceId}`,
        contract_type: "publisher_framework",
        counterparty_name: "UAT Counterparty",
        owner_role: "legal_manager",
        requested_by_role: "legal_manager",
        risk_level: "low"
      },
      created_by: legal.userId,
      updated_by: legal.userId
    },
    ["owner_user_id", "created_by", "updated_by"]
  );
}

async function runAuditViewerBlocked(context) {
  await insertBlocked(context, "audit_viewer", "publishers", {
    name: traceName(context.traceId, "Blocked Publisher"),
    region: "UAT",
    media_type: "Probe",
    integration_type: "Probe",
    metadata: baseProbeMetadata(context.traceId, "audit_viewer_blocked", "audit_viewer")
  });
  await insertBlocked(context, "audit_viewer", "advertisers", {
    name: traceName(context.traceId, "Blocked Advertiser"),
    industry: "UAT",
    region: "UAT",
    metadata: baseProbeMetadata(context.traceId, "audit_viewer_blocked", "audit_viewer")
  });
}

const runners = {
  sales_chain: runSalesChain,
  media_publisher: runMediaPublisher,
  integration_project: runIntegrationProject,
  commercial_test: runCommercialTest,
  diagnostics: runDiagnostics,
  finance_settlement: runFinanceSettlement,
  legal_contract: runLegalContract,
  audit_viewer_blocked: runAuditViewerBlocked
};

async function cleanupProbeRows(context) {
  const cleanupResults = [];

  for (const item of [...context.cleanup].reverse()) {
    const session = await signInRole(context, item.role);
    const result = await session.client.from(item.table).delete().eq("id", item.id);
    cleanupResults.push({
      table: item.table,
      id: item.id,
      role: item.role,
      ok: !result.error,
      error: result.error ? formatSupabaseError(result.error) : undefined
    });
  }

  return cleanupResults;
}

export async function runLiveWorkflowWriteProbes({ createClient, supabaseUrl, anonKey, plan, traceId, cleanup = true }) {
  const context = {
    createClient,
    supabaseUrl,
    anonKey,
    plan,
    traceId,
    cleanup: [],
    sessions: new Map()
  };
  const results = [];
  let cleanupResults = [];

  try {
    for (const check of plan.checks) {
      const startedAt = Date.now();
      await runners[check.id](context);
      results.push({
        id: check.id,
        label: check.label,
        expected: check.expected,
        status: "passed",
        durationMs: Date.now() - startedAt
      });
    }
  } finally {
    if (cleanup) {
      cleanupResults = await cleanupProbeRows(context);
    }

    for (const session of context.sessions.values()) {
      await session.client.auth.signOut();
    }
  }

  const failedCleanup = cleanupResults.filter((result) => !result.ok);
  if (failedCleanup.length > 0) {
    throw new Error(`Probe cleanup failed for ${failedCleanup.map((result) => `${result.table}:${result.id}`).join(", ")}`);
  }

  return {
    traceId,
    results,
    cleanup: cleanupResults
  };
}
