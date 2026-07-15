import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { roleCodes, type RoleCode } from "../constants/roles";
import { getRoleDisplayName, getRoleScope, useLocale } from "../lib/i18n";
import type { SupabasePasswordSignInInput } from "../repositories/authSessionRepository";

type LoginMode = "mock" | "supabase";

type LoginPageProps = {
  selectedRole: RoleCode;
  authLoading: boolean;
  authError?: string;
  authWarnings: string[];
  isSupabaseAvailable: boolean;
  onRoleChange: (role: RoleCode) => void;
  onMockSignIn: (role: RoleCode) => void;
  onSupabaseSignIn: (input: SupabasePasswordSignInInput) => void;
};

export function LoginPage({
  selectedRole,
  authLoading,
  authError,
  authWarnings,
  isSupabaseAvailable,
  onRoleChange,
  onMockSignIn,
  onSupabaseSignIn
}: LoginPageProps) {
  const { locale, t } = useLocale();
  const [loginMode, setLoginMode] = useState<LoginMode>("mock");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isSupabaseMode = loginMode === "supabase";

  function submit() {
    if (isSupabaseMode) {
      onSupabaseSignIn({
        email,
        password,
        requestedRole: selectedRole
      });
      return;
    }

    onMockSignIn(selectedRole);
  }

  return (
    <main className="min-h-screen bg-pgos-bg px-6 py-10 text-pgos-text">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-[620px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-8 shadow-card">
          <div>
            <div className="flex size-12 items-center justify-center rounded-lg bg-blue-600 text-base font-bold text-white">
              PG
            </div>
            <h1 className="mt-10 max-w-2xl text-4xl font-semibold tracking-normal text-slate-950">
              {t("login.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              {t("login.description")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[t("login.mediaReadiness"), t("login.proposalGuard"), t("login.auditFirst")].map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <ShieldCheck className="size-5 text-blue-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div>
            <p className="text-sm font-semibold text-blue-700">{t("login.phaseAccess")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{t("login.signIn")}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t("login.instructions")}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
                !isSupabaseMode ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
              onClick={() => setLoginMode("mock")}
            >
              <UserRound className="size-4" aria-hidden="true" />
              {t("login.mockRole")}
            </button>
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
                isSupabaseMode ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
              disabled={!isSupabaseAvailable}
              onClick={() => setLoginMode("supabase")}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Supabase
            </button>
          </div>

          {isSupabaseMode ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">
                  {t("login.email")}
                </label>
                <input
                  id="login-email"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="login-password">
                  {t("login.password")}
                </label>
                <input
                  id="login-password"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
          ) : null}

          <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="login-role">
            {isSupabaseMode ? t("login.requestedRole") : t("login.role")}
          </label>
          <select
            id="login-role"
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            value={selectedRole}
            onChange={(event) => onRoleChange(event.target.value as RoleCode)}
          >
            {roleCodes.map((roleCode) => (
              <option key={roleCode} value={roleCode}>
                {getRoleDisplayName(roleCode, locale)}
              </option>
            ))}
          </select>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">{getRoleDisplayName(selectedRole, locale)}</p>
            <p className="mt-1">{getRoleScope(selectedRole, locale)}</p>
          </div>

          {authError ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
              {authError}
            </div>
          ) : null}

          {authWarnings.length > 0 ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-700">
              {authWarnings[0]}
            </div>
          ) : null}

          <button
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="submit"
            disabled={authLoading || (isSupabaseMode && !isSupabaseAvailable)}
          >
            {authLoading ? t("login.signingIn") : t("login.enterWorkspace")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            {t("login.environment", { status: isSupabaseAvailable ? t("login.configured") : t("login.notConfigured") })}
          </p>
        </form>
      </section>
    </main>
  );
}
