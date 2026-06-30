import { createClient } from "@supabase/supabase-js";
import {
  buildLiveWriteProbePlan,
  describeLiveWriteProbePlan,
  runLiveWorkflowWriteProbes,
  validateLiveWriteProbePlan
} from "./supabase-live-write-probe-lib.mjs";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  loadEnvFiles,
  parseArgs
} from "./supabase-uat-auth-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const env = loadEnvFiles();
const plan = buildLiveWriteProbePlan(env, args);
const failures = validateLiveWriteProbePlan(plan, { live: args.live });

if (failures.length > 0) {
  console.error("Supabase live workflow write probe validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (!args.live) {
  const output = describeLiveWriteProbePlan(plan);
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("Supabase live workflow write probes dry-run:");
    console.log(`- Supabase URL configured: ${output.supabaseUrlConfigured}`);
    console.log(`- Anon key configured: ${output.anonKeyConfigured}`);
    for (const check of output.checks) {
      const migration = check.migration ? `; requires ${check.migration}` : "";
      console.log(`  - ${check.id}: ${check.roles.join(", ")} -> ${check.tables.join(", ")} (${check.expected}${migration})`);
    }
    console.log("Run with --live to sign in with anon sessions, write probe rows, verify actor fields, and clean up.");
  }
  process.exit(0);
}

const result = await runLiveWorkflowWriteProbes({
  createClient,
  supabaseUrl: getSupabaseUrl(env),
  anonKey: getSupabaseAnonKey(env),
  plan,
  traceId: `pgos-live-${Date.now()}`,
  cleanup: !args.noCleanup
});

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Supabase live workflow write probes completed.");
  console.log(`- Trace: ${result.traceId}`);
  for (const check of result.results) {
    console.log(`  - ${check.id}: ${check.status} (${check.durationMs}ms)`);
  }
  console.log(`- Cleanup rows: ${result.cleanup.length}`);
}
