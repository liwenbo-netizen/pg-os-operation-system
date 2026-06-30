export type GuardSeverity = "info" | "warning" | "blocked";

export type GuardResult = {
  allowed: boolean;
  severity: GuardSeverity;
  reason_code: string;
  message: string;
  required_approval_role?: string;
  audit_required: boolean;
};

