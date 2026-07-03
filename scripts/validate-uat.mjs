import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const uatValidationSteps = [
  {
    id: "secret-hygiene",
    label: "Secret hygiene and Git baseline readiness",
    script: "validate:secret-hygiene",
    live: false
  },
  {
    id: "test",
    label: "Vitest regression suite",
    script: "test",
    live: false
  },
  {
    id: "lint",
    label: "TypeScript type check",
    script: "lint",
    live: false
  },
  {
    id: "build",
    label: "Production build",
    script: "build",
    live: false
  },
  {
    id: "domain-schema",
    label: "Domain and Supabase schema alignment",
    script: "validate:domain-schema",
    live: false
  },
  {
    id: "business-audit-coverage",
    label: "Core business audit write coverage",
    script: "validate:phase28",
    live: false
  },
  {
    id: "direct-business-audit-writes",
    label: "Direct business audit writes",
    script: "validate:phase29",
    live: false
  },
  {
    id: "audit-log-business-rls",
    label: "Audit log business RLS policy",
    script: "validate:phase30",
    live: false
  },
  {
    id: "workflow-dirty-save",
    label: "Workflow snapshot dirty save",
    script: "validate:phase31",
    live: false
  },
  {
    id: "uat-script-persistence",
    label: "Production UAT script Supabase persistence",
    script: "validate:phase34",
    live: false
  },
  {
    id: "uat-result-history",
    label: "Production UAT result history and export",
    script: "validate:phase35",
    live: false
  },
  {
    id: "uat-rls",
    label: "Supabase UAT anon-session RLS gate",
    script: "verify:uat-rls",
    live: true
  },
  {
    id: "uat-live-writes",
    label: "Supabase UAT live workflow write smoke gate",
    script: "verify:uat-live-writes",
    live: true
  }
];

function parseArgs(argv) {
  return {
    localOnly: argv.includes("--local-only"),
    liveOnly: argv.includes("--live-only")
  };
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function runNpmScript(script) {
  return new Promise((resolve) => {
    let child;
    try {
      child =
        process.platform === "win32"
          ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${script}`], {
              cwd: process.cwd(),
              stdio: "inherit"
            })
          : spawn(npmCommand(), ["run", script], {
              cwd: process.cwd(),
              stdio: "inherit"
            });
    } catch {
      resolve(1);
      return;
    }

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const steps = uatValidationSteps.filter((step) => {
    if (args.localOnly) {
      return !step.live;
    }

    if (args.liveOnly) {
      return step.live;
    }

    return true;
  });

  console.log("PG OS UAT acceptance gate");
  console.log(`- Mode: ${args.localOnly ? "local-only" : args.liveOnly ? "live-only" : "full"}`);
  console.log(`- Steps: ${steps.map((step) => step.id).join(", ")}`);

  const startedAt = Date.now();
  for (const step of steps) {
    const stepStartedAt = Date.now();
    console.log(`\n[validate:uat] ${step.id}: ${step.label}`);
    const code = await runNpmScript(step.script);

    if (code !== 0) {
      console.error(`[validate:uat] ${step.id} failed after ${formatDuration(Date.now() - stepStartedAt)}.`);
      process.exit(code);
    }

    console.log(`[validate:uat] ${step.id} passed in ${formatDuration(Date.now() - stepStartedAt)}.`);
  }

  console.log(`\nPG OS UAT acceptance gate passed in ${formatDuration(Date.now() - startedAt)}.`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
