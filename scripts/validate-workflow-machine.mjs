import {
  DEFAULT_WORKFLOW_MACHINE_PATH,
  WORKFLOW_MACHINE_SOURCE_REFERENCE,
  formatWorkflowMachineError,
  loadWorkflowMachine
} from "./workflowMachineLoader.mjs";

try {
  const machine = loadWorkflowMachine();
  console.log("Workflow Machine validation passed.");
  console.log(`Machine: ${WORKFLOW_MACHINE_SOURCE_REFERENCE}`);
  console.log(`Source path: ${DEFAULT_WORKFLOW_MACHINE_PATH}`);
  console.log(`Versions: spec=${machine.spec_version}, schema=${machine.schema_version}`);
  console.log(`Registries: roles=${machine.roles.length}, transitions=${machine.transitions.length}, tasks=${Object.keys(machine.codex_task_registry).length}`);
} catch (error) {
  console.error("Workflow Machine validation failed.");
  console.error(formatWorkflowMachineError(error));
  process.exitCode = 1;
}
