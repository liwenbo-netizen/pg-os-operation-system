import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  WorkflowFeatureFlagConfigurationError,
  resolveWorkflowFeatureFlags,
  workflowFeatureFlagDefinitions
} from "../src/config/workflowFeatureFlags.ts";
import {
  LegacyWorkflowDefinitionProvider,
  V25WorkflowDefinitionProvider,
  WorkflowProviderInitializationError,
  createWorkflowDefinitionCompatibility
} from "../src/services/workflowDefinitionCompatibility.ts";
import {
  WORKFLOW_MACHINE_SOURCE_REFERENCE,
  loadWorkflowMachine,
  loadWorkflowMachineFromSource
} from "./workflowMachineLoader.mjs";

function minimalMachineYaml() {
  return `workflow_machine:
  spec_version: 1.8.0
  schema_version: 2.5.0
  roles:
  - ENGINEER
  stages:
  - S0
  node_stage_registry:
    N0: S0
  guard_registry:
    G0:
      path: gate.value
  checklist_registry:
    C0:
      items: []
  error_registry:
    E0:
      remediation_zh: fix
  role_workspace_registry:
    ENGINEER:
      default_route: /workspace/engineer
  guided_component_registry:
    TASK_CONTEXT:
      required_ui: []
  guided_flow_registry:
    F0:
      roles:
      - ENGINEER
      entry_nodes:
      - N0
      steps:
      - id: STEP0
        component: TASK_CONTEXT
  implementation_wave_registry:
    W1:
      order: 1
  codex_task_registry:
    CX-1:
      id: CX-1
      wave: W1
      depends_on: []
  transitions:
  - id: TR-1
    from:
      nodes:
      - N0
    target:
      mode: FIXED
      stage: S0
      node: N0
    actors:
    - ENGINEER
    approvers: []
    dri:
      current_role: ENGINEER
      next_role: ENGINEER
    checklist: C0
    guards:
    - G0
    errors:
    - E0
    override:
      roles: []
    ui:
      guided_flow_id: F0
`;
}

function v25Factory(loader = () => loadWorkflowMachine()) {
  return () => new V25WorkflowDefinitionProvider(loader(), WORKFLOW_MACHINE_SOURCE_REFERENCE);
}

const fixedNow = () => new Date("2026-08-01T12:00:00.000Z");

describe("workflow feature flags", () => {
  it("defines temporary, owned, default-off flags with zero rollout", () => {
    for (const definition of Object.values(workflowFeatureFlagDefinitions)) {
      expect(definition.owner).toBe("PG_OS");
      expect(definition.defaultState).toBe(false);
      expect(definition.targetRoles).toEqual([]);
      expect(definition.rolloutPercentage).toBe(0);
      expect(definition.removalDate).toBe("2027-01-31");
      expect(definition.removalCondition).toBe("legacy_provider_retired_after_observation");
    }
    expect(workflowFeatureFlagDefinitions.workflow_machine_v25_provider.killSwitch).toBe(true);
  });

  it("uses false for missing flags and accepts code or environment-key inputs", () => {
    expect(resolveWorkflowFeatureFlags()).toEqual({
      workflow_machine_v25_provider: false,
      workflow_machine_v25_validation_only: false
    });
    expect(resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: "false" })).toEqual({
      workflow_machine_v25_provider: false,
      workflow_machine_v25_validation_only: false
    });
    expect(resolveWorkflowFeatureFlags({ PGOS_WORKFLOW_MACHINE_V25_PROVIDER: "1" })).toEqual({
      workflow_machine_v25_provider: true,
      workflow_machine_v25_validation_only: false
    });
  });

  it("fails on illegal values and conflicting provider modes", () => {
    expect(() => resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: "sometimes" })).toThrowError(
      WorkflowFeatureFlagConfigurationError
    );
    expect(() =>
      resolveWorkflowFeatureFlags({
        workflow_machine_v25_provider: true,
        workflow_machine_v25_validation_only: true
      })
    ).toThrowError(/cannot be enabled together/);
  });

  it("does not leak resolved state between calls or mutate definitions", () => {
    const enabled = resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: true });
    const defaults = resolveWorkflowFeatureFlags();

    expect(enabled.workflow_machine_v25_provider).toBe(true);
    expect(defaults.workflow_machine_v25_provider).toBe(false);
    expect(Object.isFrozen(enabled)).toBe(true);
    expect(Object.isFrozen(workflowFeatureFlagDefinitions)).toBe(true);
  });
});

describe("workflow definition compatibility adapters", () => {
  it("remains isolated from the application entry and exposes no write or transition execution seam", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const compatibilitySource = readFileSync(
      resolve(process.cwd(), "src/services/workflowDefinitionCompatibility.ts"),
      "utf8"
    );

    expect(appSource).not.toContain("workflowDefinitionCompatibility");
    expect(compatibilitySource).not.toContain("supabase");
    expect(compatibilitySource).not.toContain("executeTransition");
    expect(compatibilitySource).not.toContain("saveSnapshot");
  });

  it("keeps the exact Legacy provider active when the flag is missing or false", () => {
    const legacyProvider = new LegacyWorkflowDefinitionProvider();
    const createV25Provider = vi.fn(v25Factory());

    for (const flags of [resolveWorkflowFeatureFlags(), resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: false })]) {
      const result = createWorkflowDefinitionCompatibility({ legacyProvider, flags, createV25Provider, now: fixedNow });
      expect(result.provider).toBe(legacyProvider);
      expect(result.health.configuredProvider).toBe("legacy");
      expect(result.health.activeProvider).toBe("legacy");
      expect(result.health.fallbackUsed).toBe(false);
    }
    expect(createV25Provider).not.toHaveBeenCalled();
  });

  it("passes Legacy definition reads and validation through without copying business decisions", () => {
    const roles = Object.freeze(["legacy_role"]);
    const transitions = Object.freeze([Object.freeze({ id: "legacy.action", result: "unchanged" })]);
    const validation = Object.freeze({ valid: true, errorCodes: Object.freeze([]), messages: Object.freeze(["legacy"]) });
    const provider = new LegacyWorkflowDefinitionProvider({
      getSpecVersion: () => "legacy-spec",
      getSchemaVersion: () => "legacy-schema",
      getRoles: () => roles,
      getTransitions: () => transitions,
      validate: () => validation
    });

    expect(provider.getRoles()).toBe(roles);
    expect(provider.getTransitions()).toBe(transitions);
    expect(provider.validate()).toBe(validation);
    expect(provider.getSpecVersion()).toBe("legacy-spec");
    expect(provider.getSchemaVersion()).toBe("legacy-schema");
  });

  it("activates the loader-backed V2.5 read-only provider only when explicitly enabled", () => {
    const result = createWorkflowDefinitionCompatibility({
      flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: true }),
      createV25Provider: v25Factory(),
      now: fixedNow
    });

    expect(result.provider.getSource()).toBe("v2.5");
    expect(result.provider.getSpecVersion()).toBe("1.8.0");
    expect(result.provider.getSchemaVersion()).toBe("2.5.0");
    expect(result.provider.getRoles()).toContain("SDK_INTEGRATION_ENGINEER");
    expect(result.provider.getTransitions()).toHaveLength(42);
    expect(result.health.validationStatus).toBe("valid");
    expect(result.health.sourceReference).toBe(WORKFLOW_MACHINE_SOURCE_REFERENCE);
    expect("execute" in result.provider).toBe(false);
  });

  it("returns deeply immutable V2.5 roles and transition definitions", () => {
    const machine = loadWorkflowMachine();
    const provider = new V25WorkflowDefinitionProvider(machine, WORKFLOW_MACHINE_SOURCE_REFERENCE);
    const transitions = provider.getTransitions();

    expect(Object.isFrozen(provider.getRoles())).toBe(true);
    expect(Object.isFrozen(transitions)).toBe(true);
    expect(Object.isFrozen(transitions[0])).toBe(true);
    expect(Object.isFrozen(transitions[0].target)).toBe(true);
  });

  it("validates V2.5 in shadow mode while keeping Legacy active", () => {
    const legacyProvider = new LegacyWorkflowDefinitionProvider();
    const result = createWorkflowDefinitionCompatibility({
      flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_validation_only: true }),
      legacyProvider,
      createV25Provider: v25Factory(),
      now: fixedNow
    });

    expect(result.provider).toBe(legacyProvider);
    expect(result.health.activeProvider).toBe("legacy");
    expect(result.health.validationStatus).toBe("valid");
    expect(result.health.specVersion).toBe("1.8.0");
    expect(result.health.schemaVersion).toBe("2.5.0");
  });

  it("uses the kill switch to restore Legacy immediately without loading V2.5", () => {
    const legacyProvider = new LegacyWorkflowDefinitionProvider();
    const createV25Provider = vi.fn(v25Factory());
    const result = createWorkflowDefinitionCompatibility({
      flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: true }),
      legacyProvider,
      createV25Provider,
      killSwitchActive: true,
      now: fixedNow
    });

    expect(result.provider).toBe(legacyProvider);
    expect(result.health.activeProvider).toBe("legacy");
    expect(result.health.fallbackUsed).toBe(true);
    expect(result.health.errorCode).toBe("WORKFLOW_V25_KILL_SWITCH_ACTIVE");
    expect(createV25Provider).not.toHaveBeenCalled();
  });

  it("keeps Legacy running and reports actionable errors in validation-only mode", () => {
    const failureFactories = [
      v25Factory(() => loadWorkflowMachine({ sourcePath: "missing-v25-machine.yaml" })),
      v25Factory(() => loadWorkflowMachineFromSource("workflow_machine:\n\troles: []", "fixture.yaml")),
      v25Factory(() =>
        loadWorkflowMachineFromSource(
          minimalMachineYaml().replace("spec_version: 1.8.0", "spec_version: 9.9.9"),
          "fixture.yaml"
        )
      ),
      v25Factory(() =>
        loadWorkflowMachineFromSource(
          minimalMachineYaml().replace("      - N0\n    target:", "      - MISSING_NODE\n    target:"),
          "fixture.yaml"
        )
      ),
      () => {
        throw new Error("initializer failed");
      }
    ];

    for (const createV25Provider of failureFactories) {
      const legacyProvider = new LegacyWorkflowDefinitionProvider();
      const result = createWorkflowDefinitionCompatibility({
        flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_validation_only: true }),
        legacyProvider,
        createV25Provider,
        now: fixedNow
      });

      expect(result.provider).toBe(legacyProvider);
      expect(result.health.activeProvider).toBe("legacy");
      expect(result.health.validationStatus).toBe("invalid");
      expect(result.health.errorCode).toBeTruthy();
      expect(result.health.remediation).toBeTruthy();
      expect(result.health.fallbackUsed).toBe(false);
    }
  });

  it("fails explicit V2.5 activation instead of silently presenting Legacy as V2.5", () => {
    const logger = { error: vi.fn() };
    const action = () =>
      createWorkflowDefinitionCompatibility({
        flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: true }),
        createV25Provider: v25Factory(() => loadWorkflowMachine({ sourcePath: "missing-v25-machine.yaml" })),
        logger,
        now: fixedNow
      });

    expect(action).toThrowError(WorkflowProviderInitializationError);
    try {
      action();
    } catch (error) {
      expect(error.errorCode).toBe("WORKFLOW_V25_EXPLICIT_ACTIVATION_FAILED");
      expect(error.causeErrorCode).toBe("WORKFLOW_MACHINE_FILE_NOT_FOUND");
      expect(error.remediation).toContain("Restore");
    }
    expect(logger.error).toHaveBeenCalledWith(
      "workflow_definition_provider_initialization_failed",
      expect.objectContaining({
        configuredProvider: "v2.5",
        activeProvider: "legacy",
        validationStatus: "invalid",
        errorCode: "WORKFLOW_MACHINE_FILE_NOT_FOUND"
      })
    );
  });

  it("rejects a non-V2.5 factory and a mutable unvalidated machine shape", () => {
    expect(() =>
      createWorkflowDefinitionCompatibility({
        flags: resolveWorkflowFeatureFlags({ workflow_machine_v25_provider: true }),
        createV25Provider: () => new LegacyWorkflowDefinitionProvider(),
        now: fixedNow
      })
    ).toThrowError(/non-V2.5 provider/);

    expect(
      () =>
        new V25WorkflowDefinitionProvider(
          { spec_version: "1.8.0", schema_version: "2.5.0", roles: ["ENGINEER"], transitions: [{}] },
          WORKFLOW_MACHINE_SOURCE_REFERENCE
        )
    ).toThrowError(/not a validated/);
  });
});
