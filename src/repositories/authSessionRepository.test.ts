import { describe, expect, it } from "vitest";
import {
  LocalAuthSessionRepository,
  SupabaseAuthSessionRepository,
  type SupabaseAuthLike
} from "./authSessionRepository";

type Row = Record<string, unknown>;

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message?: string } | null }> {
  private filters: Array<{ column: string; value: unknown }> = [];

  constructor(
    private readonly rows: Row[],
    private readonly error: { message?: string } | null = null
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  async maybeSingle() {
    if (this.error) {
      return { data: null, error: this.error };
    }

    return { data: this.filteredRows()[0] ?? null, error: null };
  }

  then<TResult1 = { data: Row[] | null; error: { message?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: { message?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.error ? null : this.filteredRows(), error: this.error }).then(onfulfilled, onrejected);
  }

  private filteredRows() {
    return this.rows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
  }
}

class FakeSupabase implements SupabaseAuthLike {
  readonly auth: SupabaseAuthLike["auth"];

  constructor(
    private readonly tables: Record<string, Row[]>,
    private readonly sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null,
    private readonly tableErrors: Record<string, { message?: string } | null> = {}
  ) {
    this.auth = {
      getSession: async () => ({
        data: { session: this.sessionUser ? { user: this.sessionUser } : null },
        error: null
      }),
      signInWithPassword: async () => ({
        data: {
          session: this.sessionUser ? { user: this.sessionUser } : null,
          user: this.sessionUser
        },
        error: null
      }),
      signOut: async () => ({ error: null })
    };
  }

  from(table: string) {
    return new FakeQuery(this.tables[table] ?? [], this.tableErrors[table] ?? null);
  }
}

describe("auth session repositories", () => {
  it("keeps the local mock role sign-in path", async () => {
    const repository = new LocalAuthSessionRepository();
    const result = await repository.signInWithRole("finance_manager");

    expect(result).toMatchObject({
      status: "authenticated",
      mode: "mock",
      source: "mock-role-simulator"
    });
    expect(result.user).toMatchObject({
      email: "finance_manager@pgos.local",
      roles: ["finance_manager"],
      activeRole: "finance_manager"
    });
  });

  it("binds a Supabase session to profile and user_roles rows", async () => {
    const userId = "00000001-0000-4000-8000-000000000001";
    const repository = new SupabaseAuthSessionRepository(
      new FakeSupabase(
        {
          profiles: [{ id: userId, email: "sales@pgos.local", full_name: "Sales Lead", is_active: true }],
          user_roles: [
            { user_id: userId, role_code: "sales_manager" },
            { user_id: userId, role_code: "sales_director" }
          ]
        },
        { id: userId, email: "fallback@pgos.local" }
      )
    );

    const result = await repository.getCurrentSessionUser("sales_director");

    expect(result).toMatchObject({
      status: "authenticated",
      mode: "supabase",
      source: "supabase:profiles/user_roles",
      user: {
        id: userId,
        email: "sales@pgos.local",
        fullName: "Sales Lead",
        roles: ["sales_manager", "sales_director"],
        activeRole: "sales_director"
      }
    });
  });

  it("falls back to the first assigned role when the requested role is not granted", async () => {
    const userId = "00000002-0000-4000-8000-000000000002";
    const repository = new SupabaseAuthSessionRepository(
      new FakeSupabase(
        {
          profiles: [{ id: userId, email: "media@pgos.local", full_name: "Media Lead", is_active: true }],
          user_roles: [{ user_id: userId, role_code: "media_manager" }]
        },
        { id: userId }
      )
    );

    const result = await repository.getCurrentSessionUser("finance_manager");

    expect(result.status).toBe("authenticated");
    expect(result.user?.activeRole).toBe("media_manager");
    expect(result.warnings[0]).toContain("Finance Manager");
  });

  it("blocks Supabase sessions without assigned PG OS roles", async () => {
    const userId = "00000003-0000-4000-8000-000000000003";
    const repository = new SupabaseAuthSessionRepository(
      new FakeSupabase(
        {
          profiles: [{ id: userId, email: "norole@pgos.local", full_name: "No Role", is_active: true }],
          user_roles: []
        },
        { id: userId }
      )
    );

    const result = await repository.getCurrentSessionUser("ceo");

    expect(result).toMatchObject({
      status: "error",
      mode: "supabase",
      source: "supabase:user_roles",
      error: "No PG OS role is assigned to this Supabase user."
    });
  });

  it("returns a clear error when RLS blocks user_roles", async () => {
    const userId = "00000004-0000-4000-8000-000000000004";
    const repository = new SupabaseAuthSessionRepository(
      new FakeSupabase(
        {
          profiles: [{ id: userId, email: "blocked@pgos.local", full_name: "Blocked", is_active: true }],
          user_roles: [{ user_id: userId, role_code: "ceo" }]
        },
        { id: userId },
        { user_roles: { message: "permission denied for table user_roles" } }
      )
    );

    const result = await repository.getCurrentSessionUser("ceo");

    expect(result).toMatchObject({
      status: "error",
      source: "supabase:user_roles",
      error: "permission denied for table user_roles"
    });
  });
});
