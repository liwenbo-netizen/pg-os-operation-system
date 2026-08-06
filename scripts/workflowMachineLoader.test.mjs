import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKFLOW_MACHINE_PATH,
  WORKFLOW_MACHINE_SOURCE_REFERENCE,
  WorkflowMachineLoadError,
  formatWorkflowMachineError,
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

function transitionYaml(id) {
  return `  - id: ${id}
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
      guided_flow_id: F0`;
}

function taskYaml(id, wave, dependencies = []) {
  return `    ${id}:
      id: ${id}
      wave: ${wave}
      depends_on:${dependencies.length === 0 ? " []" : `\n${dependencies.map((dependency) => `      - ${dependency}`).join("\n")}`}`;
}

function withTransitions(source, transitions) {
  return source.replace(/  transitions:[\s\S]*$/, `  transitions:\n${transitions.join("\n")}`);
}

function withTasks(source, tasks) {
  return source.replace(/  codex_task_registry:[\s\S]*?  transitions:/, `  codex_task_registry:\n${tasks.join("\n")}\n  transitions:`);
}

function withWaves(source, waves) {
  return source.replace(
    /  implementation_wave_registry:[\s\S]*?  codex_task_registry:/,
    `  implementation_wave_registry:\n${waves.join("\n")}\n  codex_task_registry:`
  );
}

function expectLoadError(action, expectedCode) {
  expect(action).toThrowError(WorkflowMachineLoadError);
  try {
    action();
  } catch (error) {
    expect(error.errorCode).toBe(expectedCode);
    expect(error.sourcePath).toBe("fixture.yaml");
    expect(error.registry).toBeTruthy();
    expect(error.remediation).toBeTruthy();
  }
}

describe("Workflow Machine V2.5 loader", () => {
  it("loads the versioned machine from its repository-relative source and deeply freezes it", () => {
    const machine = loadWorkflowMachine();

    expect(DEFAULT_WORKFLOW_MACHINE_PATH).toBe(resolve(process.cwd(), WORKFLOW_MACHINE_SOURCE_REFERENCE));
    expect(machine.spec_version).toBe("1.8.0");
    expect(machine.schema_version).toBe("2.5.0");
    expect(machine.roles).toContain("SDK_INTEGRATION_ENGINEER");
    expect(machine.transitions.some((transition) => transition.id === "TR-001")).toBe(true);
    expect(Object.isFrozen(machine)).toBe(true);
    expect(Object.isFrozen(machine.transitions)).toBe(true);
    expect(Object.isFrozen(machine.transitions[0])).toBe(true);
  });

  it("keeps loading isolated from the application entry point and state transitions", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");

    expect(appSource).not.toContain("workflowMachineLoader");
    expect(appSource).not.toContain("validate-workflow-machine");
  });

  it("fails deterministically when the machine file is absent", () => {
    expect(() => loadWorkflowMachine({ sourcePath: "missing-workflow-machine.yaml" })).toThrowError(WorkflowMachineLoadError);
    try {
      loadWorkflowMachine({ sourcePath: "missing-workflow-machine.yaml" });
    } catch (error) {
      expect(error.errorCode).toBe("WORKFLOW_MACHINE_FILE_NOT_FOUND");
      expect(error.remediation).toContain("Restore");
    }
  });

  it("rejects invalid YAML and a missing workflow_machine root", () => {
    expectLoadError(() => loadWorkflowMachineFromSource("workflow_machine:\n\troles: []", "fixture.yaml"), "YAML_PARSE_FAILED");
    expectLoadError(() => loadWorkflowMachineFromSource("workflow_machine: !unsafe []", "fixture.yaml"), "YAML_PARSE_FAILED");
    expectLoadError(() => loadWorkflowMachineFromSource("other: true", "fixture.yaml"), "WORKFLOW_MACHINE_ROOT_MISSING");
  });

  it("rejects unsupported machine versions", () => {
    expectLoadError(
      () => loadWorkflowMachineFromSource(minimalMachineYaml().replace("spec_version: 1.8.0", "spec_version: 9.9.9"), "fixture.yaml"),
      "UNSUPPORTED_SPEC_VERSION"
    );
    expectLoadError(
      () => loadWorkflowMachineFromSource(minimalMachineYaml().replace("schema_version: 2.5.0", "schema_version: 9.9.9"), "fixture.yaml"),
      "UNSUPPORTED_SCHEMA_VERSION"
    );
  });

  it("rejects missing or incorrectly typed required registries", () => {
    expectLoadError(
      () => loadWorkflowMachineFromSource(minimalMachineYaml().replace("  guard_registry:\n    G0:\n      path: gate.value\n", ""), "fixture.yaml"),
      "REQUIRED_REGISTRY_MISSING"
    );
    expectLoadError(
      () => loadWorkflowMachineFromSource(minimalMachineYaml().replace("  roles:\n  - ENGINEER", "  roles: ENGINEER"), "fixture.yaml"),
      "INVALID_REGISTRY_TYPE"
    );
  });

  it("rejects duplicate transition and task ids", () => {
    expectLoadError(
      () => loadWorkflowMachineFromSource(withTransitions(minimalMachineYaml(), [transitionYaml("TR-1"), transitionYaml("TR-1")]), "fixture.yaml"),
      "DUPLICATE_TRANSITION_ID"
    );
    expectLoadError(
      () => loadWorkflowMachineFromSource(withTasks(minimalMachineYaml(), [taskYaml("CX-1", "W1"), taskYaml("CX-2", "W1")]).replace("      id: CX-2", "      id: CX-1"), "fixture.yaml"),
      "DUPLICATE_TASK_ID"
    );
  });

  it("rejects undefined role, node, guard, checklist, error, guided-flow, and guided-component references", () => {
    const cases = [
      ["ENGINEER\n    approvers", "MISSING_ROLE\n    approvers", "UNKNOWN_ROLE_REFERENCE"],
      ["      - N0\n    target", "      - MISSING_NODE\n    target", "UNKNOWN_NODE_REFERENCE"],
      ["    - G0\n    errors", "    - MISSING_GUARD\n    errors", "UNKNOWN_GUARD_REFERENCE"],
      ["    checklist: C0", "    checklist: MISSING_CHECKLIST", "UNKNOWN_CHECKLIST_REFERENCE"],
      ["    - E0\n    override", "    - MISSING_ERROR\n    override", "UNKNOWN_ERROR_REFERENCE"],
      ["      guided_flow_id: F0", "      guided_flow_id: MISSING_FLOW", "UNKNOWN_GUIDED_FLOW_REFERENCE"],
      ["        component: TASK_CONTEXT", "        component: MISSING_COMPONENT", "UNKNOWN_GUIDED_COMPONENT_REFERENCE"]
    ];

    for (const [from, to, expectedCode] of cases) {
      expectLoadError(() => loadWorkflowMachineFromSource(minimalMachineYaml().replace(from, to), "fixture.yaml"), expectedCode);
    }
  });

  it("rejects unknown task dependencies, dependency cycles, and invalid wave ordering", () => {
    expectLoadError(
      () => loadWorkflowMachineFromSource(withTasks(minimalMachineYaml(), [taskYaml("CX-1", "W1", ["CX-MISSING"])]), "fixture.yaml"),
      "UNKNOWN_TASK_DEPENDENCY"
    );

    const cyclic = withTasks(minimalMachineYaml(), [taskYaml("CX-1", "W1", ["CX-2"]), taskYaml("CX-2", "W1", ["CX-1"])]);
    expectLoadError(() => loadWorkflowMachineFromSource(cyclic, "fixture.yaml"), "TASK_DEPENDENCY_CYCLE");

    const wrongWave = withTasks(
      withWaves(minimalMachineYaml(), ["    W1:\n      order: 1", "    W2:\n      order: 2"]),
      [taskYaml("CX-1", "W1", ["CX-2"]), taskYaml("CX-2", "W2")]
    );
    expectLoadError(() => loadWorkflowMachineFromSource(wrongWave, "fixture.yaml"), "TASK_DEPENDENCY_WAVE_ORDER");
  });

  it("formats remediation-rich failures without relying on a stack trace", () => {
    try {
      loadWorkflowMachineFromSource("workflow_machine: []", "fixture.yaml");
    } catch (error) {
      const message = formatWorkflowMachineError(error);
      expect(message).toContain("error_code:");
      expect(message).toContain("source_path: fixture.yaml");
      expect(message).toContain("registry:");
      expect(message).toContain("remediation:");
    }
  });
});
