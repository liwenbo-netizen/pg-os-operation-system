import type { RoleCode } from "../constants/roles";
import type { BusinessUser } from "../types/domain";
import { rbacService } from "./rbacService";

export type RlsTable =
  | "profiles"
  | "user_roles"
  | "publishers"
  | "publisher_contacts"
  | "publisher_ad_slots"
  | "publisher_contract_terms"
  | "integration_projects"
  | "commercial_tests"
  | "media_trust_profiles"
  | "media_trust_score_history"
  | "media_supply_packages"
  | "advertisers"
  | "opportunities"
  | "proposals"
  | "campaigns"
  | "quality_diagnostic_cases"
  | "settlements"
  | "contracts"
  | "approvals"
  | "audit_logs"
  | "sop_cards";

const tableWriteRoles: Partial<Record<RlsTable, RoleCode[]>> = {
  publishers: ["media_director", "media_manager", "integration_manager", "operations_director"],
  publisher_contacts: ["media_director", "media_manager", "integration_manager", "operations_director"],
  publisher_ad_slots: ["media_director", "media_manager", "integration_manager", "operations_director"],
  publisher_contract_terms: ["media_director", "media_manager", "finance_manager", "legal_manager", "operations_director"],
  integration_projects: ["integration_manager", "media_manager", "media_director", "operations_director"],
  commercial_tests: ["adops_manager", "media_director", "operations_director", "data_analyst"],
  media_trust_profiles: ["media_manager", "media_director", "operations_director", "data_analyst"],
  media_trust_score_history: ["media_manager", "media_director", "operations_director", "data_analyst"],
  media_supply_packages: ["media_manager", "media_director", "operations_director"],
  advertisers: ["sales_director", "sales_manager", "operations_director", "customer_success_manager"],
  opportunities: ["sales_director", "sales_manager", "operations_director", "customer_success_manager"],
  proposals: ["sales_director", "sales_manager", "operations_director", "customer_success_manager"],
  campaigns: ["adops_manager", "operations_director", "customer_success_manager"],
  quality_diagnostic_cases: [
    "operations_director",
    "media_director",
    "media_manager",
    "adops_manager",
    "integration_manager",
    "data_analyst",
    "finance_manager"
  ],
  settlements: ["finance_manager", "operations_director"],
  contracts: ["legal_manager", "finance_manager", "operations_director"],
  sop_cards: ["product_owner", "operations_director"]
};

export class RlsService {
  canReadTable(user: BusinessUser, table: RlsTable) {
    if (table === "profiles") {
      return true;
    }

    if (table === "user_roles") {
      return rbacService.hasAnyRole(user, ["system_admin", "audit_viewer", "ceo"]);
    }

    return user.roles.length > 0;
  }

  canWriteTable(user: BusinessUser, table: RlsTable) {
    if (table === "approvals") {
      return rbacService.canWriteBusinessObjects(user);
    }

    if (table === "audit_logs") {
      return user.roles.length > 0;
    }

    const allowedRoles = tableWriteRoles[table] ?? [];
    return rbacService.hasAnyRole(user, allowedRoles);
  }
}

export const rlsService = new RlsService();
