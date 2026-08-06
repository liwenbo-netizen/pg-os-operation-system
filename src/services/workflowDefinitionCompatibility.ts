import { roleCodes } from "../constants/roles";
import { resolveWorkflowFeatureFlags, type WorkflowFeatureFlags } from "../config/workflowFeatureFlags";

export type WorkflowProviderSource = "legacy" | "v2.5";
export type WorkflowValidationStatus = "valid" | "invalid" | "not_run";
export type WorkflowTransitionDefinition = Readonly<Record<string, unknown> & { id: string }>;

export type WorkflowDefinitionValidationResult = Readonly<{
  valid: boolean;
  errorCodes: readonly string[];
  messages: readonly string[];
}>;

export interface WorkflowDefinitionProvider {
  getSource(): WorkflowProviderSource;
  getSpecVersion(): string | undefined;
  getSchemaVersion(): string | undefined;
  getRoles(): readonly string[];
  getTransitions(): readonly WorkflowTransitionDefinition[];
  getSourceReference(): string | undefined;
  validate(): WorkflowDefinitionValidationResult;
}

export type LegacyWorkflowDefinitionDelegate = Readonly<{
  getSpecVersion?: () => string | undefined;
  getSchemaVersion?: () => string | undefined;
  getRoles: () => readonly string[];
  getTransitions: () => readonly WorkflowTransitionDefinition[];
  validate: () => WorkflowDefinitionValidationResult;
}>;

const legacyValidationResult: WorkflowDefinitionValidationResult = Object.freeze({
  valid: true,
  errorCodes: Object.freeze([]),
  messages: Object.freeze(["Legacy workflow behavior remains owned by the existing domain services and repositories."])
});

const emptyTransitions: readonly WorkflowTransitionDefinition[] = Object.freeze([]);

const defaultLegacyDelegate: LegacyWorkflowDefinitionDelegate = Object.freeze({
  getSpecVersion: () => undefined,
  getSchemaVersion: () => "legacy-distributed-services",
  getRoles: () => roleCodes,
  getTransitions: () => emptyTransitions,
  validate: () => legacyValidationResult
});

export class LegacyWorkflowDefinitionProvider implements WorkflowDefinitionProvider {
  constructor(private readonly delegate: LegacyWorkflowDefinitionDelegate = defaultLegacyDelegate) {}

  getSource(): WorkflowProviderSource {
    return "legacy";
  }

  getSpecVersion() {
    return this.delegate.getSpecVersion?.();
  }

  getSchemaVersion() {
    return this.delegate.getSchemaVersion?.();
  }

  getRoles() {
    return this.delegate.getRoles();
  }

  getTransitions() {
    return this.delegate.getTransitions();
  }

  getSourceReference() {
    return undefined;
  }

  validate() {
    return this.delegate.validate();
  }
}

export type LoadedV25WorkflowMachine = Readonly<{
  spec_version: string;
  schema_version: string;
  roles: readonly unknown[];
  transitions: readonly unknown[];
}>;

function freezeCopy(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeCopy(item)));
  }
  if (value && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, freezeCopy(item)]))
    );
  }
  return value;
}

export class WorkflowProviderInitializationError extends Error {
  readonly errorCode: string;
  readonly remediation: string;
  readonly causeErrorCode?: string;

  constructor(errorCode: string, message: string, remediation: string, causeErrorCode?: string) {
    super(message);
    this.name = "WorkflowProviderInitializationError";
    this.errorCode = errorCode;
    this.remediation = remediation;
    this.causeErrorCode = causeErrorCode;
  }
}

export class V25WorkflowDefinitionProvider implements WorkflowDefinitionProvider {
  private readonly roles: readonly string[];
  private readonly transitions: readonly WorkflowTransitionDefinition[];

  constructor(
    private readonly machine: LoadedV25WorkflowMachine,
    private readonly sourceReference: string
  ) {
    if (
      machine.spec_version !== "1.8.0" ||
      machine.schema_version !== "2.5.0" ||
      !Array.isArray(machine.roles) ||
      !machine.roles.every((role) => typeof role === "string") ||
      !Array.isArray(machine.transitions) ||
      !machine.transitions.every(
        (transition) =>
          Boolean(transition) &&
          typeof transition === "object" &&
          typeof (transition as Record<string, unknown>).id === "string"
      )
    ) {
      throw new WorkflowProviderInitializationError(
        "WORKFLOW_V25_DEFINITION_INVALID",
        "The supplied V2.5 workflow definition is not a validated V1.8.0 / V2.5.0 snapshot.",
        "Load and validate the canonical machine with the CX-0101 loader before constructing the V2.5 adapter."
      );
    }

    this.roles = freezeCopy(machine.roles) as readonly string[];
    this.transitions = freezeCopy(machine.transitions) as readonly WorkflowTransitionDefinition[];
  }

  getSource(): WorkflowProviderSource {
    return "v2.5";
  }

  getSpecVersion() {
    return this.machine.spec_version;
  }

  getSchemaVersion() {
    return this.machine.schema_version;
  }

  getRoles() {
    return this.roles;
  }

  getTransitions() {
    return this.transitions;
  }

  getSourceReference() {
    return this.sourceReference;
  }

  validate(): WorkflowDefinitionValidationResult {
    return Object.freeze({
      valid: true,
      errorCodes: Object.freeze([]),
      messages: Object.freeze(["The V2.5 definition was statically validated before adapter construction."])
    });
  }
}

export type WorkflowDefinitionHealth = Readonly<{
  configuredProvider: WorkflowProviderSource;
  activeProvider: WorkflowProviderSource;
  specVersion?: string;
  schemaVersion?: string;
  validationStatus: WorkflowValidationStatus;
  lastLoadedAt: string;
  sourceReference?: string;
  fallbackUsed: boolean;
  errorCode?: string;
  remediation?: string;
}>;

export type WorkflowDefinitionLogger = Readonly<{
  info?: (event: string, health: WorkflowDefinitionHealth) => void;
  warn?: (event: string, health: WorkflowDefinitionHealth) => void;
  error?: (event: string, health: WorkflowDefinitionHealth) => void;
}>;

export type WorkflowDefinitionCompatibilityResult = Readonly<{
  provider: WorkflowDefinitionProvider;
  health: WorkflowDefinitionHealth;
}>;

export type WorkflowDefinitionCompatibilityOptions = Readonly<{
  flags?: WorkflowFeatureFlags;
  legacyProvider?: WorkflowDefinitionProvider;
  createV25Provider?: () => WorkflowDefinitionProvider;
  killSwitchActive?: boolean;
  now?: () => Date;
  logger?: WorkflowDefinitionLogger;
}>;

function errorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { errorCode?: unknown; remediation?: unknown; message?: unknown };
    return {
      errorCode: typeof candidate.errorCode === "string" ? candidate.errorCode : "WORKFLOW_V25_PROVIDER_INITIALIZATION_FAILED",
      remediation:
        typeof candidate.remediation === "string"
          ? candidate.remediation
          : "Correct the V2.5 source or configuration and retry explicit activation.",
      message: typeof candidate.message === "string" ? candidate.message : "V2.5 provider initialization failed."
    };
  }
  return {
    errorCode: "WORKFLOW_V25_PROVIDER_INITIALIZATION_FAILED",
    remediation: "Correct the V2.5 source or configuration and retry explicit activation.",
    message: "V2.5 provider initialization failed."
  };
}

function loadValidatedV25Provider(factory: (() => WorkflowDefinitionProvider) | undefined) {
  if (!factory) {
    throw new WorkflowProviderInitializationError(
      "WORKFLOW_V25_PROVIDER_FACTORY_MISSING",
      "V2.5 was requested but no provider factory was configured.",
      "Configure a factory backed by the CX-0101 loader, or turn the V2.5 flags off."
    );
  }

  const provider = factory();
  if (provider.getSource() !== "v2.5") {
    throw new WorkflowProviderInitializationError(
      "WORKFLOW_V25_PROVIDER_SOURCE_INVALID",
      "The V2.5 provider factory returned a non-V2.5 provider.",
      "Configure the factory to return V25WorkflowDefinitionProvider."
    );
  }

  const validation = provider.validate();
  if (!validation.valid) {
    throw new WorkflowProviderInitializationError(
      "WORKFLOW_V25_PROVIDER_VALIDATION_FAILED",
      "The V2.5 provider reported an invalid definition.",
      "Resolve the reported validation errors before enabling the provider.",
      validation.errorCodes[0]
    );
  }
  return provider;
}

function createHealth(
  provider: WorkflowDefinitionProvider,
  configuredProvider: WorkflowProviderSource,
  validationStatus: WorkflowValidationStatus,
  lastLoadedAt: string,
  details: Partial<Pick<WorkflowDefinitionHealth, "fallbackUsed" | "errorCode" | "remediation">> = {}
): WorkflowDefinitionHealth {
  return Object.freeze({
    configuredProvider,
    activeProvider: provider.getSource(),
    specVersion: provider.getSpecVersion(),
    schemaVersion: provider.getSchemaVersion(),
    validationStatus,
    lastLoadedAt,
    sourceReference: provider.getSourceReference(),
    fallbackUsed: details.fallbackUsed ?? false,
    errorCode: details.errorCode,
    remediation: details.remediation
  });
}

export function createWorkflowDefinitionCompatibility(
  options: WorkflowDefinitionCompatibilityOptions = {}
): WorkflowDefinitionCompatibilityResult {
  const flags = options.flags ?? resolveWorkflowFeatureFlags();
  const legacyProvider = options.legacyProvider ?? new LegacyWorkflowDefinitionProvider();
  const configuredProvider: WorkflowProviderSource = flags.workflow_machine_v25_provider ? "v2.5" : "legacy";
  const lastLoadedAt = (options.now?.() ?? new Date()).toISOString();

  if (options.killSwitchActive) {
    const health = createHealth(legacyProvider, configuredProvider, "not_run", lastLoadedAt, {
      fallbackUsed: configuredProvider === "v2.5",
      errorCode: "WORKFLOW_V25_KILL_SWITCH_ACTIVE",
      remediation: "Keep the Legacy provider active until the V2.5 incident is resolved and the kill switch is deliberately cleared."
    });
    options.logger?.warn?.("workflow_definition_provider_kill_switch", health);
    return Object.freeze({ provider: legacyProvider, health });
  }

  if (flags.workflow_machine_v25_provider) {
    try {
      const provider = loadValidatedV25Provider(options.createV25Provider);
      const health = createHealth(provider, "v2.5", "valid", lastLoadedAt);
      options.logger?.info?.("workflow_definition_provider_initialized", health);
      return Object.freeze({ provider, health });
    } catch (error) {
      const details = errorDetails(error);
      const health = createHealth(legacyProvider, "v2.5", "invalid", lastLoadedAt, {
        errorCode: details.errorCode,
        remediation: details.remediation
      });
      options.logger?.error?.("workflow_definition_provider_initialization_failed", health);
      throw new WorkflowProviderInitializationError(
        "WORKFLOW_V25_EXPLICIT_ACTIVATION_FAILED",
        `Explicit V2.5 activation failed: ${details.message}`,
        details.remediation,
        details.errorCode
      );
    }
  }

  if (flags.workflow_machine_v25_validation_only) {
    try {
      const validationProvider = loadValidatedV25Provider(options.createV25Provider);
      const health = Object.freeze({
        ...createHealth(legacyProvider, "legacy", "valid", lastLoadedAt),
        specVersion: validationProvider.getSpecVersion(),
        schemaVersion: validationProvider.getSchemaVersion(),
        sourceReference: validationProvider.getSourceReference()
      });
      options.logger?.info?.("workflow_definition_validation_only_succeeded", health);
      return Object.freeze({ provider: legacyProvider, health });
    } catch (error) {
      const details = errorDetails(error);
      const health = createHealth(legacyProvider, "legacy", "invalid", lastLoadedAt, {
        errorCode: details.errorCode,
        remediation: details.remediation
      });
      options.logger?.warn?.("workflow_definition_validation_only_failed", health);
      return Object.freeze({ provider: legacyProvider, health });
    }
  }

  const validation = legacyProvider.validate();
  const health = createHealth(legacyProvider, "legacy", validation.valid ? "valid" : "invalid", lastLoadedAt, {
    errorCode: validation.errorCodes[0]
  });
  options.logger?.info?.("workflow_definition_provider_initialized", health);
  return Object.freeze({ provider: legacyProvider, health });
}
