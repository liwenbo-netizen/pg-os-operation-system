import { roleCodes, roleDefinitions, type RoleCode } from "../constants/roles";
import type { BusinessUser } from "../types/domain";
import { AuthService } from "../services/authService";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Row = Record<string, unknown>;

type SupabaseErrorLike = {
  message?: string;
};

type SupabaseSessionUserLike = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type SupabaseSessionLike = {
  user: SupabaseSessionUserLike;
};

type SupabaseListResult<T> = {
  data: T[] | null;
  error: SupabaseErrorLike | null;
};

type SupabaseSingleResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type SupabaseFilterQuery<T> = PromiseLike<SupabaseListResult<T>> & {
  select: (columns?: string) => SupabaseFilterQuery<T>;
  eq: (column: string, value: unknown) => SupabaseFilterQuery<T>;
  maybeSingle: () => Promise<SupabaseSingleResult<T>>;
};

export type SupabaseAuthLike = {
  auth: {
    getSession: () => Promise<{ data: { session: SupabaseSessionLike | null }; error: SupabaseErrorLike | null }>;
    signInWithPassword: (input: {
      email: string;
      password: string;
    }) => Promise<{ data: { session: SupabaseSessionLike | null; user: SupabaseSessionUserLike | null }; error: SupabaseErrorLike | null }>;
    signOut: () => Promise<{ error: SupabaseErrorLike | null }>;
  };
  from: (table: string) => SupabaseFilterQuery<Row>;
};

export type AuthSessionMode = "mock" | "supabase";
export type AuthSessionStatus = "authenticated" | "signed_out" | "error";

export type AuthSessionResult = {
  status: AuthSessionStatus;
  mode: AuthSessionMode;
  source: string;
  user?: BusinessUser;
  warnings: string[];
  error?: string;
};

export type SupabasePasswordSignInInput = {
  email: string;
  password: string;
  requestedRole: RoleCode;
};

export type AuthSessionRepository = {
  supportsSupabase: boolean;
  getCurrentSessionUser: (requestedRole?: RoleCode) => Promise<AuthSessionResult>;
  signInWithRole: (roleCode: RoleCode) => Promise<AuthSessionResult>;
  signInWithPassword: (input: SupabasePasswordSignInInput) => Promise<AuthSessionResult>;
  signOut: () => Promise<AuthSessionResult>;
};

function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === "string" && roleCodes.includes(value as RoleCode);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function createMockResult(roleCode: RoleCode): AuthSessionResult {
  const authService = new AuthService();

  return {
    status: "authenticated",
    mode: "mock",
    source: "mock-role-simulator",
    user: authService.createMockUser(roleCode),
    warnings: []
  };
}

function signedOutResult(mode: AuthSessionMode, source: string, warnings: string[] = []): AuthSessionResult {
  return {
    status: "signed_out",
    mode,
    source,
    warnings
  };
}

function errorResult(mode: AuthSessionMode, source: string, error: string, warnings: string[] = []): AuthSessionResult {
  return {
    status: "error",
    mode,
    source,
    error,
    warnings
  };
}

export class LocalAuthSessionRepository implements AuthSessionRepository {
  readonly supportsSupabase = false;

  async getCurrentSessionUser() {
    return signedOutResult("mock", "mock-role-simulator");
  }

  async signInWithRole(roleCode: RoleCode) {
    return createMockResult(roleCode);
  }

  async signInWithPassword() {
    return errorResult("supabase", "supabase-auth", "Supabase credentials are not configured.");
  }

  async signOut() {
    return signedOutResult("mock", "mock-role-simulator");
  }
}

export class SupabaseAuthSessionRepository implements AuthSessionRepository {
  readonly supportsSupabase = true;

  constructor(private readonly client: SupabaseAuthLike) {}

  async getCurrentSessionUser(requestedRole?: RoleCode) {
    const { data, error } = await this.client.auth.getSession();

    if (error) {
      return errorResult("supabase", "supabase-auth", error.message ?? "Unable to read Supabase session.");
    }

    if (!data.session?.user) {
      return signedOutResult("supabase", "supabase-auth");
    }

    return this.bindSupabaseUser(data.session.user, requestedRole);
  }

  async signInWithRole(roleCode: RoleCode) {
    return createMockResult(roleCode);
  }

  async signInWithPassword(input: SupabasePasswordSignInInput) {
    const email = input.email.trim();

    if (!email || !input.password) {
      return errorResult("supabase", "supabase-auth", "Email and password are required.");
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error) {
      return errorResult("supabase", "supabase-auth", error.message ?? "Supabase sign-in failed.");
    }

    const user = data.user ?? data.session?.user;
    if (!user) {
      return errorResult("supabase", "supabase-auth", "Supabase did not return an authenticated user.");
    }

    return this.bindSupabaseUser(user, input.requestedRole);
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();

    if (error) {
      return errorResult("supabase", "supabase-auth", error.message ?? "Supabase sign-out failed.");
    }

    return signedOutResult("supabase", "supabase-auth");
  }

  private async bindSupabaseUser(user: SupabaseSessionUserLike, requestedRole?: RoleCode): Promise<AuthSessionResult> {
    const warnings: string[] = [];
    const profileResult = await this.client
      .from("profiles")
      .select("id,email,full_name,is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      return errorResult(
        "supabase",
        "supabase:profiles",
        profileResult.error.message ?? "Unable to read current user profile."
      );
    }

    const profile = profileResult.data;
    if (!profile) {
      warnings.push("No matching profile row was found; using Supabase auth metadata for display.");
    }

    if (profile?.is_active === false) {
      return errorResult("supabase", "supabase:profiles", "Current profile is inactive.");
    }

    const rolesResult = await this.client.from("user_roles").select("role_code").eq("user_id", user.id);

    if (rolesResult.error) {
      return errorResult(
        "supabase",
        "supabase:user_roles",
        rolesResult.error.message ?? "Unable to read current user roles."
      );
    }

    const roles = Array.from(
      new Set((rolesResult.data ?? []).map((row) => row.role_code).filter(isRoleCode))
    );

    if (roles.length === 0) {
      return errorResult(
        "supabase",
        "supabase:user_roles",
        "No PG OS role is assigned to this Supabase user."
      );
    }

    const activeRole = requestedRole && roles.includes(requestedRole) ? requestedRole : roles[0];
    if (requestedRole && activeRole !== requestedRole) {
      warnings.push(`${roleDefinitions[requestedRole].name} is not assigned to this user; using ${roleDefinitions[activeRole].name}.`);
    }

    const email = stringValue(profile?.email, stringValue(user.email, "unknown@pgos.local"));
    const fullName = stringValue(profile?.full_name, stringValue(user.user_metadata?.full_name, stringValue(user.user_metadata?.name, email)));

    return {
      status: "authenticated",
      mode: "supabase",
      source: "supabase:profiles/user_roles",
      user: {
        id: user.id,
        email,
        fullName,
        roles,
        activeRole
      },
      warnings
    };
  }
}

export function createAuthSessionRepository(): AuthSessionRepository {
  if (isSupabaseConfigured && supabase) {
    return new SupabaseAuthSessionRepository(supabase as unknown as SupabaseAuthLike);
  }

  return new LocalAuthSessionRepository();
}
