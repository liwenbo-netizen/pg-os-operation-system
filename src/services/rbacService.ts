import { roleCapabilities, type CapabilityCode } from "../constants/capabilities";
import { roleDefinitions, type RoleCode } from "../constants/roles";
import type { BusinessUser } from "../types/domain";

export class RbacService {
  hasRole(user: BusinessUser, roleCode: RoleCode) {
    return user.roles.includes(roleCode);
  }

  hasAnyRole(user: BusinessUser, roles: RoleCode[]) {
    return user.roles.some((role) => roles.includes(role));
  }

  hasCapability(user: BusinessUser, capability: CapabilityCode) {
    return user.roles.some((role) => roleCapabilities[role].includes(capability));
  }

  isBusinessApprovalRole(user: BusinessUser) {
    return user.roles.some((role) => roleDefinitions[role].isBusinessApprovalRole);
  }

  canWriteBusinessObjects(user: BusinessUser) {
    return !this.hasAnyRole(user, ["audit_viewer"]) && !this.hasRole(user, "system_admin");
  }
}

export const rbacService = new RbacService();

