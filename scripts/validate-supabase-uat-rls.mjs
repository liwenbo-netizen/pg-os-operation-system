import { createClient } from "@supabase/supabase-js";
import {
  buildRlsVerificationPlan,
  describeRlsVerificationPlan,
  getSupabaseAnonKey,
  getSupabaseUrl,
  loadEnvFiles,
  parseArgs,
  runRlsVerification,
  validateRlsVerificationPlan
} from "./supabase-uat-auth-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const env = loadEnvFiles();
const plan = buildRlsVerificationPlan(env, args);
const failures = validateRlsVerificationPlan(plan, { live: args.live });

if (failures.length > 0) {
  console.error("Supabase UAT RLS verification validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (!args.live) {
  const output = describeRlsVerificationPlan(plan);
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("Supabase UAT RLS verification dry-run:");
    console.log(`- Supabase URL configured: ${output.supabaseUrlConfigured}`);
    console.log(`- Anon key configured: ${output.anonKeyConfigured}`);
    for (const check of output.checks) {
      console.log(`  - ${check.role}: ${check.email}, publisher write ${check.expectedPublisherWrite}`);
    }
    console.log("Run with --live to sign in with anon sessions and perform RLS probes.");
  }
  process.exit(0);
}

const result = await runRlsVerification({
  createClient,
  supabaseUrl: getSupabaseUrl(env),
  anonKey: getSupabaseAnonKey(env),
  plan,
  traceId: `pgos-uat-${Date.now()}`,
  cleanup: !args.noCleanup
});

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Supabase UAT RLS verification completed.");
  console.log(`- Trace: ${result.traceId}`);
  for (const check of result.results) {
    console.log(
      `  - ${check.role}: profile=${check.profileRead}, user_roles=${check.userRolesRead}, publishers_read=${check.publisherRead}, publishers_write=${check.publisherWrite}`
    );
  }
}
