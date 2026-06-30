import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const roleDefinitions = [
  { code: "ceo", name: "CEO", description: "Global operations and risk visibility", isBusinessApprovalRole: true },
  { code: "operations_director", name: "Operations Director", description: "Cross-role operations coordination", isBusinessApprovalRole: true },
  { code: "sales_director", name: "Sales Director", description: "Sales team and proposal approval", isBusinessApprovalRole: true },
  { code: "sales_manager", name: "Sales Manager", description: "Advertisers, opportunities, and proposal drafts", isBusinessApprovalRole: false },
  { code: "media_director", name: "Media Director", description: "Media readiness approval and scale decisions", isBusinessApprovalRole: true },
  { code: "media_manager", name: "Media Manager", description: "Publisher onboarding and media operations", isBusinessApprovalRole: false },
  { code: "adops_manager", name: "AdOps Manager", description: "Campaign execution and launch checks", isBusinessApprovalRole: false },
  { code: "integration_manager", name: "Integration Manager", description: "SDK, API, VAST, and CTV integration", isBusinessApprovalRole: false },
  { code: "data_analyst", name: "Data Analyst", description: "Funnel analysis and diagnostic evidence", isBusinessApprovalRole: false },
  { code: "finance_manager", name: "Finance Manager", description: "Settlement, invoice, and finance exceptions", isBusinessApprovalRole: true },
  { code: "legal_manager", name: "Legal Manager", description: "Contract review and legal coordination", isBusinessApprovalRole: true },
  { code: "customer_success_manager", name: "Customer Success Manager", description: "Client delivery and post-launch follow-up", isBusinessApprovalRole: false },
  { code: "product_owner", name: "Product Owner", description: "Product configuration, SOP, and workflow tuning", isBusinessApprovalRole: false },
  { code: "system_admin", name: "System Admin", description: "System administration without business approval ownership", isBusinessApprovalRole: false },
  { code: "audit_viewer", name: "Audit Viewer", description: "Read-only audit access", isBusinessApprovalRole: false }
];

export const roleCodes = roleDefinitions.map((role) => role.code);

export function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    live: false,
    resetPasswords: false,
    noCleanup: false,
    json: false,
    roles: undefined
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--live") {
      args.live = true;
    } else if (arg === "--reset-passwords") {
      args.resetPasswords = true;
    } else if (arg === "--no-cleanup") {
      args.noCleanup = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg.startsWith("--roles=")) {
      args.roles = arg
        .slice("--roles=".length)
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean);
    }
  }

  return args;
}

export function loadEnvFiles(root = process.cwd(), fileNames = [".env.local", ".env"]) {
  const env = { ...process.env };

  for (const fileName of fileNames) {
    const filePath = resolve(root, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (env[key] === undefined) {
        env[key] = value;
      }
    }
  }

  return env;
}

export function getSupabaseUrl(env) {
  return normalizeSupabaseProjectUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "");
}

export function normalizeSupabaseProjectUrl(value) {
  const rawValue = value.trim();
  if (!rawValue) {
    return "";
  }

  let url;
  try {
    url = new URL(rawValue);
  } catch {
    return rawValue;
  }

  const knownServicePaths = ["/auth/v1", "/rest/v1", "/storage/v1", "/functions/v1", "/realtime/v1"];
  const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase();
  const servicePath = knownServicePaths.find((path) => normalizedPath.endsWith(path));

  if (servicePath) {
    url.pathname = url.pathname.slice(0, url.pathname.length - servicePath.length) || "/";
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function getSupabaseAnonKey(env) {
  return env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
}

export function getSupabaseServiceRoleKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function buildUatUsers(env = {}, selectedRoles = roleCodes) {
  const emailDomain = env.PGOS_UAT_EMAIL_DOMAIN || "pgos-uat.local";
  const emailPrefix = env.PGOS_UAT_EMAIL_PREFIX || "";
  const defaultPassword = env.PGOS_UAT_DEFAULT_PASSWORD || "";
  const selected = new Set(selectedRoles);

  return roleDefinitions
    .filter((role) => selected.has(role.code))
    .map((role) => {
      const passwordEnvName = `PGOS_UAT_PASSWORD_${role.code.toUpperCase()}`;
      const password = env[passwordEnvName] || defaultPassword;

      return {
        email: `${emailPrefix}${role.code}@${emailDomain}`.toLowerCase(),
        password,
        fullName: `PG OS UAT ${role.name}`,
        title: role.name,
        department: "PG OS UAT",
        roles: [role.code],
        primaryRole: role.code,
        passwordEnvName: env[passwordEnvName] ? passwordEnvName : "PGOS_UAT_DEFAULT_PASSWORD"
      };
    });
}

export function buildBootstrapPlan(env = {}, args = {}) {
  const selectedRoles = args.roles ?? roleCodes;
  const unknownRoles = selectedRoles.filter((role) => !roleCodes.includes(role));
  const users = buildUatUsers(env, selectedRoles);

  return {
    supabaseUrl: getSupabaseUrl(env),
    hasAnonKey: Boolean(getSupabaseAnonKey(env)),
    hasServiceRoleKey: Boolean(getSupabaseServiceRoleKey(env)),
    users,
    unknownRoles,
    roles: roleDefinitions.filter((role) => selectedRoles.includes(role.code))
  };
}

export function validateBootstrapPlan(plan, { apply = false } = {}) {
  const failures = [];

  if (plan.unknownRoles.length > 0) {
    failures.push(`Unknown role(s): ${plan.unknownRoles.join(", ")}`);
  }

  if (apply && !plan.supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }

  if (apply && !plan.hasServiceRoleKey) {
    failures.push("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  if (apply) {
    const missingPasswords = plan.users.filter((user) => !user.password);
    if (missingPasswords.length > 0) {
      failures.push(
        `Missing UAT password for ${missingPasswords.map((user) => user.email).join(", ")}. Set PGOS_UAT_DEFAULT_PASSWORD or per-role PGOS_UAT_PASSWORD_<ROLE>.`
      );
    }
  }

  return failures;
}

function redactUser(user) {
  return {
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    passwordSource: user.password ? user.passwordEnvName : "missing"
  };
}

export function describeBootstrapPlan(plan) {
  return {
    supabaseUrlConfigured: Boolean(plan.supabaseUrl),
    serviceRoleConfigured: plan.hasServiceRoleKey,
    anonKeyConfigured: plan.hasAnonKey,
    users: plan.users.map(redactUser)
  };
}

async function throwIfError(result, action) {
  if (result?.error) {
    throw new Error(`${action}: ${formatSupabaseError(result.error)}`);
  }

  return result;
}

export function formatSupabaseError(error) {
  if (!error) {
    return "Supabase request failed";
  }

  if (typeof error === "string") {
    return error;
  }

  const parts = [
    error.name,
    error.status ? `status=${error.status}` : "",
    error.code ? `code=${error.code}` : "",
    error.message
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  try {
    const json = JSON.stringify(error);
    return json && json !== "{}" ? json : "Supabase request failed with an empty error object";
  } catch {
    return "Supabase request failed with an unserializable error object";
  }
}

export async function listAuthUsersByEmail(client) {
  const byEmail = new Map();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const result = await throwIfError(
      await client.auth.admin.listUsers({ page, perPage }),
      "list auth users"
    );
    const users = result.data?.users ?? [];

    for (const user of users) {
      if (user.email) {
        byEmail.set(user.email.toLowerCase(), user);
      }
    }

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return byEmail;
}

export async function bootstrapUatAuth({ client, plan, resetPasswords = false, dryRun = false }) {
  if (dryRun) {
    return {
      mode: "dry-run",
      createdUsers: [],
      updatedUsers: [],
      profilesUpserted: 0,
      userRolesUpserted: 0,
      rolesUpserted: 0,
      warnings: [],
      plan: describeBootstrapPlan(plan)
    };
  }

  let existingUsers = new Map();
  let authUserListAvailable = true;
  const warnings = [];

  try {
    existingUsers = await listAuthUsersByEmail(client);
  } catch (error) {
    authUserListAvailable = false;
    warnings.push(
      `Auth Admin listUsers failed; continuing with create-first bootstrap. Existing users may require manual reconciliation. ${error.message}`
    );
  }

  const createdUsers = [];
  const updatedUsers = [];
  const authUsers = [];

  await throwIfError(
    await client.from("roles").upsert(
      plan.roles.map((role) => ({
        code: role.code,
        name: role.name,
        description: role.description,
        is_business_approval_role: role.isBusinessApprovalRole
      })),
      { onConflict: "code" }
    ),
    "upsert roles"
  );

  for (const userPlan of plan.users) {
    const existing = existingUsers.get(userPlan.email.toLowerCase());
    const metadata = {
      pgos_uat: true,
      full_name: userPlan.fullName,
      role_codes: userPlan.roles
    };

    if (existing) {
      const updatePayload = {
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          ...metadata
        }
      };

      if (resetPasswords) {
        updatePayload.password = userPlan.password;
      }

      const result = await throwIfError(
        await client.auth.admin.updateUserById(existing.id, updatePayload),
        `update auth user ${userPlan.email}`
      );
      updatedUsers.push(userPlan.email);
      authUsers.push({ ...userPlan, id: result.data.user.id });
    } else {
      const createResult = await client.auth.admin.createUser({
        email: userPlan.email,
        password: userPlan.password,
        email_confirm: true,
        user_metadata: metadata
      });

      if (createResult.error) {
        if (!authUserListAvailable && isExistingAuthUserError(createResult.error)) {
          throw new Error(
            `create auth user ${userPlan.email}: user already exists, but Auth Admin listUsers failed earlier; cannot resolve the auth user id to sync profile/user_roles. ${formatSupabaseError(createResult.error)}`
          );
        }

        throw new Error(`create auth user ${userPlan.email}: ${formatSupabaseError(createResult.error)}`);
      }

      const result = await throwIfError(createResult, `create auth user ${userPlan.email}`);
      createdUsers.push(userPlan.email);
      authUsers.push({ ...userPlan, id: result.data.user.id });
    }
  }

  await throwIfError(
    await client.from("profiles").upsert(
      authUsers.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        title: user.title,
        department: user.department,
        is_active: true,
        metadata: {
          pgos_uat: true,
          role_codes: user.roles
        }
      })),
      { onConflict: "id" }
    ),
    "upsert profiles"
  );

  const userRoleRows = authUsers.flatMap((user) =>
    user.roles.map((roleCode) => ({
      user_id: user.id,
      role_code: roleCode
    }))
  );

  await throwIfError(
    await client.from("user_roles").upsert(userRoleRows, { onConflict: "user_id,role_code" }),
    "upsert user_roles"
  );

  return {
    mode: "apply",
    createdUsers,
    updatedUsers,
    profilesUpserted: authUsers.length,
    userRolesUpserted: userRoleRows.length,
    rolesUpserted: plan.roles.length,
    warnings
  };
}

export function isExistingAuthUserError(error) {
  const text = formatSupabaseError(error).toLowerCase();
  return (
    error?.status === 422 ||
    text.includes("already") ||
    text.includes("registered") ||
    text.includes("exists") ||
    text.includes("duplicate")
  );
}

export function buildRlsVerificationPlan(env = {}, args = {}) {
  const bootstrapPlan = buildBootstrapPlan(env, args);
  const byRole = new Map(bootstrapPlan.users.map((user) => [user.primaryRole, user]));

  return {
    supabaseUrl: getSupabaseUrl(env),
    anonKeyConfigured: Boolean(getSupabaseAnonKey(env)),
    checks: [
      {
        label: "media_manager can read own profile, read own user_roles, read publishers, and write publishers",
        role: "media_manager",
        user: byRole.get("media_manager"),
        expectedPublisherWrite: "allowed"
      },
      {
        label: "audit_viewer can read publishers but cannot write publishers",
        role: "audit_viewer",
        user: byRole.get("audit_viewer"),
        expectedPublisherWrite: "blocked"
      }
    ].filter((check) => check.user)
  };
}

export function validateRlsVerificationPlan(plan, { live = false } = {}) {
  const failures = [];

  if (live && !plan.supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }

  if (live && !plan.anonKeyConfigured) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  }

  const missingPasswords = plan.checks.filter((check) => !check.user.password);
  if (live && missingPasswords.length > 0) {
    failures.push(
      `Missing password for ${missingPasswords.map((check) => check.user.email).join(", ")}. Set PGOS_UAT_DEFAULT_PASSWORD or per-role password env.`
    );
  }

  return failures;
}

export function describeRlsVerificationPlan(plan) {
  return {
    supabaseUrlConfigured: Boolean(plan.supabaseUrl),
    anonKeyConfigured: plan.anonKeyConfigured,
    checks: plan.checks.map((check) => ({
      label: check.label,
      role: check.role,
      email: check.user.email,
      expectedPublisherWrite: check.expectedPublisherWrite
    }))
  };
}

export async function runRlsVerification({ createClient, supabaseUrl, anonKey, plan, traceId, cleanup = true }) {
  const results = [];

  for (const check of plan.checks) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const signIn = await client.auth.signInWithPassword({
      email: check.user.email,
      password: check.user.password
    });

    if (signIn.error || !signIn.data.user) {
      throw new Error(`${check.role} sign-in failed: ${signIn.error?.message ?? "no user returned"}`);
    }

    const userId = signIn.data.user.id;
    const profileRead = await client.from("profiles").select("id,email").eq("id", userId).maybeSingle();
    const userRolesRead = await client.from("user_roles").select("role_code").eq("user_id", userId);
    const publisherRead = await client.from("publishers").select("id,name").limit(1);
    const profileReadOk = !profileRead.error && Boolean(profileRead.data);
    const userRolesReadOk = !userRolesRead.error && (userRolesRead.data ?? []).length > 0;
    const publisherReadOk = !publisherRead.error;

    if (!profileReadOk || !userRolesReadOk || !publisherReadOk) {
      throw new Error(
        `${check.role} RLS read expectation failed. profile=${profileReadOk}, user_roles=${userRolesReadOk}, publishers=${publisherReadOk}`
      );
    }

    const writeAttempt = await client
      .from("publishers")
      .insert({
        name: `UAT RLS Probe ${traceId} ${check.role}`,
        region: "UAT",
        media_type: "Probe",
        integration_type: "Probe",
        metadata: {
          uat_probe: true,
          trace_id: traceId,
          role: check.role
        }
      })
      .select("id")
      .maybeSingle();

    const writeAllowed = !writeAttempt.error && Boolean(writeAttempt.data?.id);
    const expectedAllowed = check.expectedPublisherWrite === "allowed";

    if (writeAllowed !== expectedAllowed) {
      throw new Error(
        `${check.role} publisher write expectation failed. expected=${check.expectedPublisherWrite}, actual=${writeAllowed ? "allowed" : "blocked"}`
      );
    }

    if (writeAllowed && cleanup) {
      await client.from("publishers").delete().eq("id", writeAttempt.data.id);
    }

    await client.auth.signOut();

    results.push({
      role: check.role,
      email: check.user.email,
      profileRead: profileReadOk,
      userRolesRead: userRolesReadOk,
      publisherRead: publisherReadOk,
      publisherWrite: writeAllowed ? "allowed" : "blocked"
    });
  }

  return {
    traceId,
    results
  };
}
