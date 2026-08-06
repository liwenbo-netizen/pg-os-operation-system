import { describe, expect, it } from "vitest";
import {
  isPlaceholderValue,
  scanTextForSecrets,
  validateEnvExample,
  validateGitignore
} from "./validate-secret-hygiene.mjs";

const validEnvExample = `
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENV=development
APP_BASE_URL=http://localhost:5173
PGOS_UAT_EMAIL_DOMAIN=pgos-uat.local
PGOS_UAT_EMAIL_PREFIX=
PGOS_UAT_DEFAULT_PASSWORD=
SUPABASE_STAGING_PROJECT_REF=
SUPABASE_STAGING_DB_URL=
SUPABASE_STAGING_DB_PASSWORD=
SUPABASE_STAGING_DB_HOST=
PG_OS_DATABASE_ENV=
PG_OS_NO_PRODUCTION_PROJECT=
PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY=
PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT=
PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY=
SUPABASE_PRODUCTION_PROJECT_REF=
SUPABASE_PRODUCTION_DB_HOST=
SUPABASE_ACCESS_TOKEN=
PG_OS_ENABLE_MIGRATION_WRITE=false
`;

describe("validate-secret-hygiene", () => {
  it("allows blank, local, and placeholder env example values", () => {
    expect(isPlaceholderValue("")).toBe(true);
    expect(isPlaceholderValue("http://localhost:5173")).toBe(true);
    expect(isPlaceholderValue("<service-role-key>")).toBe(true);
    expect(validateEnvExample(validEnvExample)).toEqual([]);
  });

  it("rejects populated sensitive env example values without exposing the value", () => {
    const key = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
    const failures = validateEnvExample(`${validEnvExample}\n${key}=real-looking-value`);

    expect(failures).toEqual([".env.example contains a non-placeholder value for SUPABASE_SERVICE_ROLE_KEY."]);
    expect(failures.join(" ")).not.toContain("real-looking-value");
  });

  it("requires gitignore protections for local env and build artifacts", () => {
    const failures = validateGitignore(`
node_modules/
dist/
.vite/
.env
.env.*
!.env.example
*.log
`);

    expect(failures).toEqual([]);
  });

  it("finds JWT-like tokens without returning the token itself", () => {
    const fakeJwt = [
      "eyJfakeHeaderValueThatIsLongEnough",
      "eyJfakePayloadValueThatIsLongEnough",
      "fakeSignatureValueThatIsLongEnough"
    ].join(".");
    const findings = scanTextForSecrets("src/example.ts", `const token = "${fakeJwt}";`);

    expect(findings).toEqual([
      {
        file: "src/example.ts",
        line: 1,
        pattern: "jwt-like-token"
      }
    ]);
    expect(JSON.stringify(findings)).not.toContain(fakeJwt);
  });
});
