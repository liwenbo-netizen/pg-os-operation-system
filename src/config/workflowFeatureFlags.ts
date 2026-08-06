export const workflowFeatureFlagCodes = [
  "workflow_machine_v25_provider",
  "workflow_machine_v25_validation_only"
] as const;

export type WorkflowFeatureFlagCode = (typeof workflowFeatureFlagCodes)[number];

export type WorkflowFeatureFlagEnvironmentKey =
  | "PGOS_WORKFLOW_MACHINE_V25_PROVIDER"
  | "PGOS_WORKFLOW_MACHINE_V25_VALIDATION_ONLY";

export type WorkflowFeatureFlagDefinition = Readonly<{
  code: WorkflowFeatureFlagCode;
  environmentKey: WorkflowFeatureFlagEnvironmentKey;
  owner: "PG_OS";
  defaultState: false;
  targetRoles: readonly string[];
  rolloutPercentage: 0;
  killSwitch: boolean;
  removalDate: string;
  removalCondition: string;
}>;

const removalDate = "2027-01-31";
const removalCondition = "legacy_provider_retired_after_observation";

export const workflowFeatureFlagDefinitions: Readonly<Record<WorkflowFeatureFlagCode, WorkflowFeatureFlagDefinition>> =
  Object.freeze({
    workflow_machine_v25_provider: Object.freeze({
      code: "workflow_machine_v25_provider",
      environmentKey: "PGOS_WORKFLOW_MACHINE_V25_PROVIDER",
      owner: "PG_OS",
      defaultState: false,
      targetRoles: Object.freeze([]),
      rolloutPercentage: 0,
      killSwitch: true,
      removalDate,
      removalCondition
    }),
    workflow_machine_v25_validation_only: Object.freeze({
      code: "workflow_machine_v25_validation_only",
      environmentKey: "PGOS_WORKFLOW_MACHINE_V25_VALIDATION_ONLY",
      owner: "PG_OS",
      defaultState: false,
      targetRoles: Object.freeze([]),
      rolloutPercentage: 0,
      killSwitch: false,
      removalDate,
      removalCondition
    })
  });

export type WorkflowFeatureFlags = Readonly<Record<WorkflowFeatureFlagCode, boolean>>;

export type WorkflowFeatureFlagSource = Partial<
  Record<WorkflowFeatureFlagCode | WorkflowFeatureFlagEnvironmentKey, boolean | string | undefined>
>;

export class WorkflowFeatureFlagConfigurationError extends Error {
  readonly errorCode: string;
  readonly remediation: string;

  constructor(errorCode: string, message: string, remediation: string) {
    super(message);
    this.name = "WorkflowFeatureFlagConfigurationError";
    this.errorCode = errorCode;
    this.remediation = remediation;
  }
}

function parseBooleanFlag(value: boolean | string | undefined, definition: WorkflowFeatureFlagDefinition) {
  if (value === undefined || value === "") {
    return definition.defaultState;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new WorkflowFeatureFlagConfigurationError(
    "WORKFLOW_FEATURE_FLAG_VALUE_INVALID",
    `Feature flag '${definition.code}' must be true, false, 1, or 0.`,
    `Correct ${definition.environmentKey}; leave it unset to use the safe false default.`
  );
}

export function resolveWorkflowFeatureFlags(source: WorkflowFeatureFlagSource = {}): WorkflowFeatureFlags {
  const resolved = Object.fromEntries(
    workflowFeatureFlagCodes.map((code) => {
      const definition = workflowFeatureFlagDefinitions[code];
      const value = source[code] ?? source[definition.environmentKey];
      return [code, parseBooleanFlag(value, definition)];
    })
  ) as Record<WorkflowFeatureFlagCode, boolean>;

  if (resolved.workflow_machine_v25_provider && resolved.workflow_machine_v25_validation_only) {
    throw new WorkflowFeatureFlagConfigurationError(
      "WORKFLOW_FEATURE_FLAG_MODE_CONFLICT",
      "Explicit V2.5 provider mode and validation-only mode cannot be enabled together.",
      "Enable workflow_machine_v25_provider for explicit activation, or workflow_machine_v25_validation_only for shadow validation, but not both."
    );
  }

  return Object.freeze(resolved);
}
