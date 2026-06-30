import type { RoleCode } from "../constants/roles";
import type { GuardResult } from "../types/guards";
import { authService } from "../services/authService";
import { guardService } from "../services/guardService";

export function canViewRoute(roleCode: RoleCode, routePath: string): GuardResult {
  return guardService.canViewRoute(authService.createMockUser(roleCode), routePath);
}
