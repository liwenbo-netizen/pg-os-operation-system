import { describe, expect, it } from "vitest";
import {
  bootstrapUatAuth,
  buildBootstrapPlan,
  buildRlsVerificationPlan,
  buildUatUsers,
  describeBootstrapPlan,
  getSupabaseUrl,
  normalizeSupabaseProjectUrl,
  validateBootstrapPlan,
  validateRlsVerificationPlan
} from "./supabase-uat-auth-lib.mjs";

class FakeTable {
  constructor(name, writes) {
    this.name = name;
    this.writes = writes;
  }

  async upsert(rows) {
    this.writes[this.name] = rows;
    return { data: rows, error: null };
  }
}

class FakeSupabaseAdmin {
  constructor(existingUsers = [], options = {}) {
    this.writes = {};
    this.created = [];
    this.updated = [];
    this.users = existingUsers;
    this.listUsersError = options.listUsersError;
    this.auth = {
      admin: {
        listUsers: async () =>
          this.listUsersError ? { data: { users: [] }, error: this.listUsersError } : { data: { users: this.users }, error: null },
        createUser: async (payload) => {
          const user = {
            id: `created-${this.created.length + 1}`,
            email: payload.email,
            user_metadata: payload.user_metadata
          };
          this.created.push(payload);
          this.users.push(user);
          return { data: { user }, error: null };
        },
        updateUserById: async (id, payload) => {
          this.updated.push({ id, payload });
          const user = this.users.find((candidate) => candidate.id === id) ?? { id, email: "unknown@pgos.local" };
          user.user_metadata = payload.user_metadata;
          return { data: { user }, error: null };
        }
      }
    };
  }

  from(table) {
    return new FakeTable(table, this.writes);
  }
}

describe("Supabase UAT auth bootstrap plan", () => {
  it("builds one UAT auth user per PG OS role", () => {
    const users = buildUatUsers({
      PGOS_UAT_EMAIL_DOMAIN: "example.test",
      PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
    });

    expect(users).toHaveLength(15);
    expect(users[0]).toMatchObject({
      email: "ceo@example.test",
      roles: ["ceo"],
      passwordEnvName: "PGOS_UAT_DEFAULT_PASSWORD"
    });
  });

  it("validates required live bootstrap settings without exposing secrets", () => {
    const plan = buildBootstrapPlan({}, { roles: ["ceo"] });
    const failures = validateBootstrapPlan(plan, { apply: true });
    const description = describeBootstrapPlan(plan);

    expect(failures).toEqual([
      "VITE_SUPABASE_URL or SUPABASE_URL is required.",
      "SUPABASE_SERVICE_ROLE_KEY is required.",
      "Missing UAT password for ceo@pgos-uat.local. Set PGOS_UAT_DEFAULT_PASSWORD or per-role PGOS_UAT_PASSWORD_<ROLE>."
    ]);
    expect(description.users[0]).toEqual({
      email: "ceo@pgos-uat.local",
      fullName: "PG OS UAT CEO",
      roles: ["ceo"],
      passwordSource: "missing"
    });
  });

  it("normalizes copied Supabase service URLs back to the project URL", () => {
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co/rest/v1")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co/auth/v1/")).toBe("https://example.supabase.co");
    expect(getSupabaseUrl({ VITE_SUPABASE_URL: "https://example.supabase.co/storage/v1?x=1" })).toBe(
      "https://example.supabase.co"
    );
  });

  it("bootstraps auth users, profiles, roles, and user_roles through the admin client", async () => {
    const plan = buildBootstrapPlan(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
      },
      { roles: ["ceo", "media_manager"] }
    );
    const client = new FakeSupabaseAdmin([{ id: "existing-media", email: "media_manager@pgos-uat.local" }]);

    const result = await bootstrapUatAuth({ client, plan });

    expect(result).toMatchObject({
      mode: "apply",
      createdUsers: ["ceo@pgos-uat.local"],
      updatedUsers: ["media_manager@pgos-uat.local"],
      profilesUpserted: 2,
      userRolesUpserted: 2,
      rolesUpserted: 2
    });
    expect(client.writes.roles).toHaveLength(2);
    expect(client.writes.profiles).toEqual([
      expect.objectContaining({ email: "ceo@pgos-uat.local", is_active: true }),
      expect.objectContaining({ id: "existing-media", email: "media_manager@pgos-uat.local", is_active: true })
    ]);
    expect(client.writes.user_roles).toEqual([
      expect.objectContaining({ role_code: "ceo" }),
      expect.objectContaining({ user_id: "existing-media", role_code: "media_manager" })
    ]);
  });

  it("falls back to create-first bootstrap when auth user listing is unavailable", async () => {
    const plan = buildBootstrapPlan(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
      },
      { roles: ["ceo"] }
    );
    const client = new FakeSupabaseAdmin([], {
      listUsersError: { name: "AuthRetryableFetchError", status: 500 }
    });

    const result = await bootstrapUatAuth({ client, plan });

    expect(result.createdUsers).toEqual(["ceo@pgos-uat.local"]);
    expect(result.warnings[0]).toContain("Auth Admin listUsers failed");
    expect(client.writes.profiles).toEqual([expect.objectContaining({ id: "created-1", email: "ceo@pgos-uat.local" })]);
    expect(client.writes.user_roles).toEqual([expect.objectContaining({ user_id: "created-1", role_code: "ceo" })]);
  });

  it("builds a dry-run RLS plan for anon session probes", () => {
    const plan = buildRlsVerificationPlan({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
    });

    expect(validateRlsVerificationPlan(plan, { live: true })).toEqual([]);
    expect(plan.checks).toEqual([
      expect.objectContaining({ role: "media_manager", expectedPublisherWrite: "allowed" }),
      expect.objectContaining({ role: "audit_viewer", expectedPublisherWrite: "blocked" })
    ]);
  });
});
