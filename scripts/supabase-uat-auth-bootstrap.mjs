import { createClient } from "@supabase/supabase-js";
import {
  bootstrapUatAuth,
  buildBootstrapPlan,
  describeBootstrapPlan,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  loadEnvFiles,
  parseArgs,
  validateBootstrapPlan
} from "./supabase-uat-auth-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const env = loadEnvFiles();
const plan = buildBootstrapPlan(env, args);
const apply = args.apply && !args.dryRun;
const failures = validateBootstrapPlan(plan, { apply });

if (failures.length > 0) {
  console.error("Supabase UAT auth bootstrap validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (!apply) {
  const output = describeBootstrapPlan(plan);
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("Supabase UAT auth bootstrap dry-run:");
    console.log(`- Supabase URL configured: ${output.supabaseUrlConfigured}`);
    console.log(`- Service role configured: ${output.serviceRoleConfigured}`);
    console.log(`- Planned users: ${output.users.length}`);
    for (const user of output.users) {
      console.log(`  - ${user.email}: ${user.roles.join(", ")} (${user.passwordSource})`);
    }
  }
  process.exit(0);
}

const client = createClient(getSupabaseUrl(env), getSupabaseServiceRoleKey(env), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const result = await bootstrapUatAuth({
  client,
  plan,
  resetPasswords: args.resetPasswords,
  dryRun: false
});

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Supabase UAT auth bootstrap completed.");
  console.log(`- Created users: ${result.createdUsers.length}`);
  console.log(`- Updated users: ${result.updatedUsers.length}`);
  console.log(`- Profiles upserted: ${result.profilesUpserted}`);
  console.log(`- User roles upserted: ${result.userRolesUpserted}`);
  console.log(`- Roles upserted: ${result.rolesUpserted}`);
  for (const warning of result.warnings) {
    console.log(`- Warning: ${warning}`);
  }
}
