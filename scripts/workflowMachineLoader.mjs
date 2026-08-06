import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WORKFLOW_MACHINE_SOURCE_REFERENCE = "docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml";
export const DEFAULT_WORKFLOW_MACHINE_PATH = fileURLToPath(
  new URL("../docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml", import.meta.url)
);

const EXPECTED_SPEC_VERSION = "1.8.0";
const EXPECTED_SCHEMA_VERSION = "2.5.0";
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_NESTING_DEPTH = 64;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const REQUIRED_REGISTRIES = [
  "roles",
  "node_stage_registry",
  "transitions",
  "guard_registry",
  "checklist_registry",
  "error_registry",
  "role_workspace_registry",
  "guided_component_registry",
  "guided_flow_registry",
  "implementation_wave_registry",
  "codex_task_registry"
];

export class WorkflowMachineLoadError extends Error {
  constructor({ errorCode, message, sourcePath, registry = "workflow_machine", reference, remediation }) {
    super(message);
    this.name = "WorkflowMachineLoadError";
    this.errorCode = errorCode;
    this.sourcePath = sourcePath;
    this.registry = registry;
    this.reference = reference;
    this.remediation = remediation;
  }
}

class WorkflowMachineParseError extends Error {
  constructor(message, lineNumber) {
    super(message);
    this.name = "WorkflowMachineParseError";
    this.lineNumber = lineNumber;
  }
}

function fail(errorCode, message, details) {
  throw new WorkflowMachineLoadError({ errorCode, message, ...details });
}

function stripInlineComment(value) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inDoubleQuote && character === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if (!escaped && character === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    if (!escaped && character === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
    if (!inSingleQuote && !inDoubleQuote && character === "#" && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index).trimEnd();
    }
    escaped = false;
  }

  return value.trimEnd();
}

function tokenizeYaml(source) {
  if (Buffer.byteLength(source, "utf8") > MAX_DOCUMENT_BYTES) {
    throw new WorkflowMachineParseError(`YAML exceeds the ${MAX_DOCUMENT_BYTES} byte safety limit.`, 1);
  }

  return source.replace(/^\uFEFF/, "").split(/\r?\n/).flatMap((rawLine, index) => {
    const lineNumber = index + 1;
    if (/\t/.test(rawLine)) {
      throw new WorkflowMachineParseError("Tabs are not supported in the restricted YAML parser.", lineNumber);
    }

    const withoutComment = stripInlineComment(rawLine);
    if (!withoutComment.trim()) return [];
    if (withoutComment.trim() === "---" || withoutComment.trim() === "...") {
      throw new WorkflowMachineParseError("YAML document markers are not supported.", lineNumber);
    }

    const indentation = withoutComment.match(/^ */)[0].length;
    return [{ indentation, text: withoutComment.slice(indentation), lineNumber }];
  });
}

function parseMappingEntry(text, lineNumber) {
  const separatorIndex = text.indexOf(":");
  if (separatorIndex <= 0) {
    throw new WorkflowMachineParseError("Expected a mapping entry with a non-empty key.", lineNumber);
  }

  const key = text.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(key) || FORBIDDEN_OBJECT_KEYS.has(key)) {
    throw new WorkflowMachineParseError(`Unsupported or unsafe mapping key '${key}'.`, lineNumber);
  }

  return { key, valueText: text.slice(separatorIndex + 1).trim() };
}

function parseScalar(valueText, anchors, lineNumber) {
  if (!valueText) {
    throw new WorkflowMachineParseError("Expected a scalar value or nested block.", lineNumber);
  }
  if (/^!/.test(valueText)) {
    throw new WorkflowMachineParseError("Custom YAML tags are not permitted.", lineNumber);
  }
  if (/^[[{]/.test(valueText) && valueText !== "[]") {
    throw new WorkflowMachineParseError("Flow-style YAML collections are not permitted.", lineNumber);
  }
  if (/^&/.test(valueText)) {
    throw new WorkflowMachineParseError("Anchors must precede a nested block or a scalar value.", lineNumber);
  }
  if (/^\*/.test(valueText)) {
    const alias = valueText.slice(1);
    if (!/^[A-Za-z0-9_-]+$/.test(alias) || !anchors.has(alias)) {
      throw new WorkflowMachineParseError(`Unknown YAML alias '${valueText}'.`, lineNumber);
    }
    return anchors.get(alias);
  }
  if (valueText === "[]") return [];
  if (valueText === "null" || valueText === "~") return null;
  if (valueText === "true") return true;
  if (valueText === "false") return false;
  if (/^-?\d+$/.test(valueText)) return Number(valueText);
  if (valueText.startsWith('"')) {
    try {
      return JSON.parse(valueText);
    } catch {
      throw new WorkflowMachineParseError("Invalid double-quoted YAML string.", lineNumber);
    }
  }
  if (valueText.startsWith("'")) {
    if (!valueText.endsWith("'")) {
      throw new WorkflowMachineParseError("Invalid single-quoted YAML string.", lineNumber);
    }
    return valueText.slice(1, -1).replace(/''/g, "'");
  }
  return valueText;
}

function parseAnchor(valueText, lineNumber) {
  const match = valueText.match(/^&([A-Za-z0-9_-]+)(?:\s+(.*))?$/);
  if (!match) return undefined;
  return { name: match[1], scalarText: match[2] };
}

function assertNoDuplicateKey(target, key, lineNumber) {
  if (Object.hasOwn(target, key)) {
    throw new WorkflowMachineParseError(`Duplicate mapping key '${key}'.`, lineNumber);
  }
}

function parseYamlBlock(tokens, startIndex, indentation, anchors, depth) {
  if (depth > MAX_NESTING_DEPTH) {
    throw new WorkflowMachineParseError(`YAML nesting exceeds the ${MAX_NESTING_DEPTH} level safety limit.`, tokens[startIndex]?.lineNumber ?? 1);
  }

  const first = tokens[startIndex];
  if (!first || first.indentation !== indentation) {
    throw new WorkflowMachineParseError("Invalid nested YAML indentation.", first?.lineNumber ?? 1);
  }

  if (first.text === "-" || first.text.startsWith("- ")) {
    return parseYamlArray(tokens, startIndex, indentation, anchors, depth + 1);
  }
  return parseYamlObject(tokens, startIndex, indentation, anchors, depth + 1);
}

function parseValueOrNestedBlock(tokens, index, current, valueText, anchors, depth) {
  const anchor = parseAnchor(valueText, current.lineNumber);
  const requiresNestedBlock = valueText === "" || (anchor && anchor.scalarText === undefined);

  if (requiresNestedBlock) {
    const next = tokens[index + 1];
    const isIndentlessSequence = next?.indentation === current.indentation && (next.text === "-" || next.text.startsWith("- "));
    if (!next || next.indentation < current.indentation || (next.indentation === current.indentation && !isIndentlessSequence)) {
      throw new WorkflowMachineParseError("Expected an indented nested block.", current.lineNumber);
    }
    const parsed = parseYamlBlock(tokens, index + 1, next.indentation, anchors, depth + 1);
    if (anchor) anchors.set(anchor.name, parsed.value);
    return parsed;
  }

  const scalar = parseScalar(anchor ? anchor.scalarText : valueText, anchors, current.lineNumber);
  if (anchor) anchors.set(anchor.name, scalar);
  return { value: scalar, nextIndex: index + 1 };
}

function parseYamlObject(tokens, startIndex, indentation, anchors, depth) {
  const target = {};
  let index = startIndex;

  while (index < tokens.length) {
    const current = tokens[index];
    if (current.indentation < indentation) break;
    if (current.indentation > indentation) {
      throw new WorkflowMachineParseError("Unexpected nested indentation in mapping.", current.lineNumber);
    }
    if (current.text === "-" || current.text.startsWith("- ")) break;

    const { key, valueText } = parseMappingEntry(current.text, current.lineNumber);
    assertNoDuplicateKey(target, key, current.lineNumber);
    const parsed = parseValueOrNestedBlock(tokens, index, current, valueText, anchors, depth + 1);
    target[key] = parsed.value;
    index = parsed.nextIndex;
  }

  return { value: target, nextIndex: index };
}

function parseYamlArray(tokens, startIndex, indentation, anchors, depth) {
  const target = [];
  let index = startIndex;

  while (index < tokens.length) {
    const current = tokens[index];
    if (current.indentation < indentation) break;
    if (current.indentation > indentation) {
      throw new WorkflowMachineParseError("Unexpected nested indentation in sequence.", current.lineNumber);
    }
    if (current.text !== "-" && !current.text.startsWith("- ")) break;

    const itemText = current.text === "-" ? "" : current.text.slice(2).trim();
    if (!itemText) {
      const parsed = parseValueOrNestedBlock(tokens, index, current, "", anchors, depth + 1);
      target.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }

    if (/^[A-Za-z0-9_.-]+:/.test(itemText)) {
      const item = {};
      const { key, valueText } = parseMappingEntry(itemText, current.lineNumber);
      const parsedInitial = parseValueOrNestedBlock(tokens, index, current, valueText, anchors, depth + 1);
      item[key] = parsedInitial.value;
      index = parsedInitial.nextIndex;

      if (index < tokens.length && tokens[index].indentation > indentation) {
        const continuation = parseYamlBlock(tokens, index, tokens[index].indentation, anchors, depth + 1);
        if (Array.isArray(continuation.value)) {
          throw new WorkflowMachineParseError("Sequence mapping item cannot continue with an array.", tokens[index].lineNumber);
        }
        for (const [continuationKey, continuationValue] of Object.entries(continuation.value)) {
          assertNoDuplicateKey(item, continuationKey, tokens[index].lineNumber);
          item[continuationKey] = continuationValue;
        }
        index = continuation.nextIndex;
      }
      target.push(item);
      continue;
    }

    const scalar = parseScalar(itemText, anchors, current.lineNumber);
    if (index + 1 < tokens.length && tokens[index + 1].indentation > indentation) {
      throw new WorkflowMachineParseError("Scalar sequence item cannot contain a nested block.", current.lineNumber);
    }
    target.push(scalar);
    index += 1;
  }

  return { value: target, nextIndex: index };
}

export function parseWorkflowMachineYaml(source) {
  const tokens = tokenizeYaml(source);
  if (tokens.length === 0) {
    throw new WorkflowMachineParseError("YAML document is empty.", 1);
  }
  const parsed = parseYamlBlock(tokens, 0, tokens[0].indentation, new Map(), 0);
  if (parsed.nextIndex !== tokens.length) {
    throw new WorkflowMachineParseError("YAML document contains an unparsed block.", tokens[parsed.nextIndex].lineNumber);
  }
  return parsed.value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, details) {
  if (!isRecord(value)) {
    fail("INVALID_REGISTRY_TYPE", `${details.registry} must be a mapping.`, {
      ...details,
      remediation: "Restore the registry as a YAML mapping with uniquely named entries."
    });
  }
  return value;
}

function requireArray(value, details) {
  if (!Array.isArray(value)) {
    fail("INVALID_REGISTRY_TYPE", `${details.registry} must be a list.`, {
      ...details,
      remediation: "Restore the registry as a YAML list."
    });
  }
  return value;
}

function requireString(value, details) {
  if (typeof value !== "string" || value.length === 0) {
    fail("INVALID_REFERENCE", `${details.registry} requires a non-empty string reference.`, {
      ...details,
      remediation: "Provide a registered non-empty identifier."
    });
  }
  return value;
}

function validateUniqueStrings(values, details) {
  const seen = new Set();
  for (const value of values) {
    requireString(value, details);
    if (seen.has(value)) {
      fail("DUPLICATE_REGISTRY_CODE", `${details.registry} contains duplicate code '${value}'.`, {
        ...details,
        reference: value,
        remediation: "Keep one entry for each registry code."
      });
    }
    seen.add(value);
  }
  return seen;
}

function validateRoleReference(value, roleCodes, dynamicRoleCodes, details) {
  const reference = requireString(value, details);
  if (!roleCodes.has(reference) && !dynamicRoleCodes.has(reference)) {
    fail("UNKNOWN_ROLE_REFERENCE", `${details.registry} references unknown role '${reference}'.`, {
      ...details,
      reference,
      remediation: "Use a role from workflow_machine.roles or a registered dynamic role resolver."
    });
  }
}

function validateNodeReference(value, nodeStageRegistry, details) {
  const reference = requireString(value, details);
  if (!Object.hasOwn(nodeStageRegistry, reference)) {
    fail("UNKNOWN_NODE_REFERENCE", `${details.registry} references unknown node '${reference}'.`, {
      ...details,
      reference,
      remediation: "Use a node defined in node_stage_registry."
    });
  }
}

function validateRegistryReference(value, registryValues, errorCode, details) {
  const reference = requireString(value, details);
  if (!Object.hasOwn(registryValues, reference)) {
    fail(errorCode, `${details.registry} references missing '${reference}'.`, {
      ...details,
      reference,
      remediation: `Add '${reference}' to the referenced registry or replace the reference with an existing code.`
    });
  }
}

function validateStringArray(values, details, validator) {
  for (const value of requireArray(values, details)) {
    validator(value);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function validateTransitionRegistry(machine, registries, sourcePath) {
  const transitions = requireArray(machine.transitions, { sourcePath, registry: "transitions" });
  const transitionIds = new Set();

  for (const transition of transitions) {
    const transitionRecord = requireRecord(transition, { sourcePath, registry: "transitions" });
    const id = requireString(transitionRecord.id, { sourcePath, registry: "transitions" });
    if (transitionIds.has(id)) {
      fail("DUPLICATE_TRANSITION_ID", `transitions contains duplicate id '${id}'.`, {
        sourcePath,
        registry: "transitions",
        reference: id,
        remediation: "Assign a unique transition id."
      });
    }
    transitionIds.add(id);

    const referenceDetails = { sourcePath, registry: `transitions.${id}` };
    const from = requireRecord(transitionRecord.from, { ...referenceDetails, registry: `${referenceDetails.registry}.from` });
    validateStringArray(from.nodes, { ...referenceDetails, registry: `${referenceDetails.registry}.from.nodes` }, (node) =>
      validateNodeReference(node, registries.nodeStages, referenceDetails)
    );

    const target = requireRecord(transitionRecord.target, { ...referenceDetails, registry: `${referenceDetails.registry}.target` });
    const targetMode = requireString(target.mode, { ...referenceDetails, registry: `${referenceDetails.registry}.target.mode` });
    if (targetMode === "FIXED") {
      validateNodeReference(target.node, registries.nodeStages, referenceDetails);
      const targetStage = requireString(target.stage, { ...referenceDetails, registry: `${referenceDetails.registry}.target.stage` });
      if (!registries.stages.has(targetStage)) {
        fail("NODE_STAGE_REFERENCE_INVALID", `${referenceDetails.registry} targets unknown stage '${targetStage}'.`, {
          ...referenceDetails,
          reference: targetStage,
          remediation: "Use a stage from workflow_machine.stages."
        });
      }
      if (registries.nodeStages[target.node] !== targetStage) {
        fail("NODE_STAGE_REFERENCE_INVALID", `${referenceDetails.registry} target node '${target.node}' does not map to stage '${targetStage}'.`, {
          ...referenceDetails,
          reference: target.node,
          remediation: "Align target.stage with node_stage_registry[target.node]."
        });
      }
    } else if (targetMode === "MUTATE_CURRENT") {
      requireRecord(target.set, { ...referenceDetails, registry: `${referenceDetails.registry}.target.set` });
    } else if (targetMode === "RESOLVE_FROM_FIELD") {
      validateRegistryReference(target.resolver, registries.targetResolvers, "INVALID_REFERENCE", {
        ...referenceDetails,
        registry: `${referenceDetails.registry}.target.resolver`
      });
    } else {
      fail("INVALID_REFERENCE", `${referenceDetails.registry} uses unsupported target mode '${targetMode}'.`, {
        ...referenceDetails,
        reference: targetMode,
        remediation: "Use a target mode defined by the Workflow Machine specification."
      });
    }

    validateStringArray(transitionRecord.actors, { ...referenceDetails, registry: `${referenceDetails.registry}.actors` }, (role) =>
      validateRoleReference(role, registries.roles, registries.dynamicRoles, referenceDetails)
    );
    validateStringArray(transitionRecord.approvers, { ...referenceDetails, registry: `${referenceDetails.registry}.approvers` }, (role) =>
      validateRoleReference(role, registries.roles, registries.dynamicRoles, referenceDetails)
    );

    const dri = requireRecord(transitionRecord.dri, { ...referenceDetails, registry: `${referenceDetails.registry}.dri` });
    validateRoleReference(dri.current_role, registries.roles, registries.dynamicRoles, referenceDetails);
    validateRoleReference(dri.next_role, registries.roles, registries.dynamicRoles, referenceDetails);

    const override = requireRecord(transitionRecord.override, { ...referenceDetails, registry: `${referenceDetails.registry}.override` });
    validateStringArray(override.roles, { ...referenceDetails, registry: `${referenceDetails.registry}.override.roles` }, (role) =>
      validateRoleReference(role, registries.roles, registries.dynamicRoles, referenceDetails)
    );

    if (transitionRecord.checklist != null) {
      validateRegistryReference(transitionRecord.checklist, registries.checklists, "UNKNOWN_CHECKLIST_REFERENCE", {
        ...referenceDetails,
        registry: `${referenceDetails.registry}.checklist`
      });
    }
    validateStringArray(transitionRecord.guards, { ...referenceDetails, registry: `${referenceDetails.registry}.guards` }, (guard) =>
      validateRegistryReference(guard, registries.guards, "UNKNOWN_GUARD_REFERENCE", referenceDetails)
    );
    validateStringArray(transitionRecord.errors, { ...referenceDetails, registry: `${referenceDetails.registry}.errors` }, (errorCode) =>
      validateRegistryReference(errorCode, registries.errors, "UNKNOWN_ERROR_REFERENCE", referenceDetails)
    );

    const ui = requireRecord(transitionRecord.ui, { ...referenceDetails, registry: `${referenceDetails.registry}.ui` });
    validateRegistryReference(ui.guided_flow_id, registries.guidedFlows, "UNKNOWN_GUIDED_FLOW_REFERENCE", {
      ...referenceDetails,
      registry: `${referenceDetails.registry}.ui.guided_flow_id`
    });
  }
}

function validateGuidedFlows(machine, registries, sourcePath) {
  for (const [flowId, flow] of Object.entries(registries.guidedFlows)) {
    const flowRecord = requireRecord(flow, { sourcePath, registry: `guided_flow_registry.${flowId}` });
    const details = { sourcePath, registry: `guided_flow_registry.${flowId}` };
    validateStringArray(flowRecord.roles, { ...details, registry: `${details.registry}.roles` }, (role) =>
      validateRoleReference(role, registries.roles, registries.dynamicRoles, details)
    );
    if (flowRecord.entry_nodes != null) {
      validateStringArray(flowRecord.entry_nodes, { ...details, registry: `${details.registry}.entry_nodes` }, (node) =>
        validateNodeReference(node, registries.nodeStages, details)
      );
    }

    const stepIds = new Set();
    for (const step of requireArray(flowRecord.steps, { ...details, registry: `${details.registry}.steps` })) {
      const stepRecord = requireRecord(step, { ...details, registry: `${details.registry}.steps` });
      const stepId = requireString(stepRecord.id, { ...details, registry: `${details.registry}.steps` });
      if (stepIds.has(stepId)) {
        fail("DUPLICATE_REGISTRY_CODE", `${details.registry}.steps contains duplicate id '${stepId}'.`, {
          ...details,
          reference: stepId,
          remediation: "Assign unique guided step ids within the flow."
        });
      }
      stepIds.add(stepId);
      validateRegistryReference(stepRecord.component, registries.guidedComponents, "UNKNOWN_GUIDED_COMPONENT_REFERENCE", {
        ...details,
        registry: `${details.registry}.steps.${stepId}.component`
      });
    }
  }
}

function validateTaskDag(machine, registries, sourcePath) {
  const waves = registries.waves;
  const waveOrders = new Map();
  for (const [waveId, wave] of Object.entries(waves)) {
    const waveRecord = requireRecord(wave, { sourcePath, registry: `implementation_wave_registry.${waveId}` });
    if (typeof waveRecord.order !== "number") {
      fail("INVALID_REGISTRY_TYPE", `implementation_wave_registry.${waveId}.order must be a number.`, {
        sourcePath,
        registry: `implementation_wave_registry.${waveId}`,
        reference: waveId,
        remediation: "Set an explicit numeric wave order."
      });
    }
    waveOrders.set(waveId, waveRecord.order);
  }

  const taskRecords = new Map();
  for (const [registryTaskId, task] of Object.entries(registries.tasks)) {
    const taskRecord = requireRecord(task, { sourcePath, registry: `codex_task_registry.${registryTaskId}` });
    const taskId = requireString(taskRecord.id, { sourcePath, registry: `codex_task_registry.${registryTaskId}` });
    if (taskRecords.has(taskId)) {
      fail("DUPLICATE_TASK_ID", `codex_task_registry contains duplicate id '${taskId}'.`, {
        sourcePath,
        registry: "codex_task_registry",
        reference: taskId,
        remediation: "Assign each Codex task a unique id."
      });
    }
    if (taskId !== registryTaskId) {
      fail("INVALID_REFERENCE", `codex_task_registry key '${registryTaskId}' does not match task id '${taskId}'.`, {
        sourcePath,
        registry: "codex_task_registry",
        reference: registryTaskId,
        remediation: "Keep each task registry key equal to its id."
      });
    }
    validateRegistryReference(taskRecord.wave, waves, "INVALID_REFERENCE", {
      sourcePath,
      registry: `codex_task_registry.${taskId}.wave`
    });
    requireArray(taskRecord.depends_on, { sourcePath, registry: `codex_task_registry.${taskId}.depends_on` });
    taskRecords.set(taskId, taskRecord);
  }

  for (const [taskId, task] of taskRecords) {
    for (const dependencyId of task.depends_on) {
      if (!taskRecords.has(dependencyId)) {
        fail("UNKNOWN_TASK_DEPENDENCY", `codex_task_registry.${taskId} depends on missing task '${dependencyId}'.`, {
          sourcePath,
          registry: `codex_task_registry.${taskId}.depends_on`,
          reference: dependencyId,
          remediation: "Add the dependency task or remove the invalid dependency."
        });
      }
      const dependency = taskRecords.get(dependencyId);
      if (waveOrders.get(dependency.wave) > waveOrders.get(task.wave)) {
        fail("TASK_DEPENDENCY_WAVE_ORDER", `codex_task_registry.${taskId} depends on later-wave task '${dependencyId}'.`, {
          sourcePath,
          registry: `codex_task_registry.${taskId}.depends_on`,
          reference: dependencyId,
          remediation: "Move the dependency to an earlier or equal wave, or reorder the task waves."
        });
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (taskId, path) => {
    if (visiting.has(taskId)) {
      const cycle = [...path, taskId].join(" -> ");
      fail("TASK_DEPENDENCY_CYCLE", `codex_task_registry contains dependency cycle: ${cycle}.`, {
        sourcePath,
        registry: "codex_task_registry",
        reference: cycle,
        remediation: "Remove or reorder one dependency in the cycle."
      });
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependencyId of taskRecords.get(taskId).depends_on) visit(dependencyId, [...path, taskId]);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const taskId of taskRecords.keys()) visit(taskId, []);
}

export function validateWorkflowMachine(document, sourcePath = "<inline>") {
  if (!isRecord(document) || !isRecord(document.workflow_machine)) {
    fail("WORKFLOW_MACHINE_ROOT_MISSING", "Top-level workflow_machine mapping was not found.", {
      sourcePath,
      registry: "workflow_machine",
      remediation: "Provide one top-level workflow_machine mapping."
    });
  }

  const machine = document.workflow_machine;
  if (String(machine.spec_version) !== EXPECTED_SPEC_VERSION) {
    fail("UNSUPPORTED_SPEC_VERSION", `Unsupported spec_version '${machine.spec_version ?? "(missing)"}'.`, {
      sourcePath,
      registry: "workflow_machine.spec_version",
      reference: String(machine.spec_version ?? "(missing)"),
      remediation: `Use spec_version ${EXPECTED_SPEC_VERSION}.`
    });
  }
  if (String(machine.schema_version) !== EXPECTED_SCHEMA_VERSION) {
    fail("UNSUPPORTED_SCHEMA_VERSION", `Unsupported schema_version '${machine.schema_version ?? "(missing)"}'.`, {
      sourcePath,
      registry: "workflow_machine.schema_version",
      reference: String(machine.schema_version ?? "(missing)"),
      remediation: `Use schema_version ${EXPECTED_SCHEMA_VERSION}.`
    });
  }

  for (const registry of REQUIRED_REGISTRIES) {
    if (!Object.hasOwn(machine, registry)) {
      fail("REQUIRED_REGISTRY_MISSING", `Required registry '${registry}' is missing.`, {
        sourcePath,
        registry,
        reference: registry,
        remediation: "Restore the required registry from the versioned Workflow Machine specification."
      });
    }
  }

  const roles = validateUniqueStrings(requireArray(machine.roles, { sourcePath, registry: "roles" }), { sourcePath, registry: "roles" });
  const stages = validateUniqueStrings(requireArray(machine.stages, { sourcePath, registry: "stages" }), { sourcePath, registry: "stages" });
  const nodeStages = requireRecord(machine.node_stage_registry, { sourcePath, registry: "node_stage_registry" });
  for (const [node, stage] of Object.entries(nodeStages)) {
    if (!stages.has(stage)) {
      fail("NODE_STAGE_REFERENCE_INVALID", `node_stage_registry.${node} references unknown stage '${stage}'.`, {
        sourcePath,
        registry: "node_stage_registry",
        reference: node,
        remediation: "Map every workflow node to a stage from workflow_machine.stages."
      });
    }
  }

  const registries = {
    roles,
    stages,
    nodeStages,
    guards: requireRecord(machine.guard_registry, { sourcePath, registry: "guard_registry" }),
    checklists: requireRecord(machine.checklist_registry, { sourcePath, registry: "checklist_registry" }),
    errors: requireRecord(machine.error_registry, { sourcePath, registry: "error_registry" }),
    guidedComponents: requireRecord(machine.guided_component_registry, { sourcePath, registry: "guided_component_registry" }),
    guidedFlows: requireRecord(machine.guided_flow_registry, { sourcePath, registry: "guided_flow_registry" }),
    waves: requireRecord(machine.implementation_wave_registry, { sourcePath, registry: "implementation_wave_registry" }),
    tasks: requireRecord(machine.codex_task_registry, { sourcePath, registry: "codex_task_registry" }),
    targetResolvers: isRecord(machine.target_resolver_registry)
      ? machine.target_resolver_registry
      : {},
    dynamicRoles: isRecord(machine.dynamic_role_resolver_registry)
      ? new Set(Object.keys(machine.dynamic_role_resolver_registry))
      : new Set()
  };
  requireRecord(machine.role_workspace_registry, { sourcePath, registry: "role_workspace_registry" });

  validateTransitionRegistry(machine, registries, sourcePath);
  validateGuidedFlows(machine, registries, sourcePath);
  validateTaskDag(machine, registries, sourcePath);
  return machine;
}

export function loadWorkflowMachineFromSource(source, sourcePath = "<inline>") {
  try {
    return deepFreeze(validateWorkflowMachine(parseWorkflowMachineYaml(source), sourcePath));
  } catch (error) {
    if (error instanceof WorkflowMachineLoadError) throw error;
    if (error instanceof WorkflowMachineParseError) {
      fail("YAML_PARSE_FAILED", `Unable to safely parse YAML at line ${error.lineNumber}: ${error.message}`, {
        sourcePath,
        registry: "workflow_machine",
        remediation: "Use the supported mapping, list, scalar, and anchor/alias YAML subset without tags or executable expressions."
      });
    }
    fail("YAML_PARSE_FAILED", "Unable to safely parse the Workflow Machine YAML.", {
      sourcePath,
      registry: "workflow_machine",
      remediation: "Correct the YAML document and rerun the validator."
    });
  }
}

export function loadWorkflowMachine({ sourcePath = DEFAULT_WORKFLOW_MACHINE_PATH } = {}) {
  const resolvedSourcePath = resolve(sourcePath);
  if (!existsSync(resolvedSourcePath)) {
    fail("WORKFLOW_MACHINE_FILE_NOT_FOUND", "Workflow Machine YAML file was not found.", {
      sourcePath: resolvedSourcePath,
      registry: "workflow_machine",
      remediation: `Restore ${WORKFLOW_MACHINE_SOURCE_REFERENCE} or provide a valid machine source path.`
    });
  }
  return loadWorkflowMachineFromSource(readFileSync(resolvedSourcePath, "utf8"), resolvedSourcePath);
}

export function formatWorkflowMachineError(error) {
  if (!(error instanceof WorkflowMachineLoadError)) return String(error);
  return [
    `error_code: ${error.errorCode}`,
    `message: ${error.message}`,
    `source_path: ${error.sourcePath}`,
    `registry: ${error.registry}`,
    `reference: ${error.reference ?? "(none)"}`,
    `remediation: ${error.remediation}`
  ].join("\n");
}
