import { roleDefinitions, type RoleCode } from "../constants/roles";
import type { BusinessUser } from "../types/domain";
import { ok } from "./apiResponse";

export class AuthService {
  signInWithRole(roleCode: RoleCode) {
    const role = roleDefinitions[roleCode];

    return ok<BusinessUser>({
      id: `user-${roleCode}`,
      email: `${roleCode}@pgos.local`,
      fullName: role.name,
      roles: [roleCode],
      activeRole: roleCode
    });
  }

  createMockUser(roleCode: RoleCode): BusinessUser {
    return this.signInWithRole(roleCode).data as BusinessUser;
  }
}

export const authService = new AuthService();

