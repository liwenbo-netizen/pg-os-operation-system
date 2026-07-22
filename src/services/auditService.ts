import type { AuditEvent, BusinessUser, EntityId, ObjectType } from "../types/domain";
import type { GuardResult } from "../types/guards";

export class AuditService {
  createGuardAuditEvent(
    user: BusinessUser,
    action: string,
    objectType: ObjectType,
    guardResult: GuardResult,
    objectId?: EntityId,
    metadata?: Record<string, unknown>
  ): AuditEvent {
    return {
      id: crypto.randomUUID(),
      actorUserId: user.id,
      action,
      objectType,
      objectId,
      allowed: guardResult.allowed,
      reasonCode: guardResult.reason_code,
      createdAt: new Date().toISOString(),
      metadata
    };
  }
}

export const auditService = new AuditService();
