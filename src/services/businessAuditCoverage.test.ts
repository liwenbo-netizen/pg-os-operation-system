import { describe, expect, it } from "vitest";
import {
  buildBusinessAuditAfterData,
  CORE_BUSINESS_AUDIT_ACTIONS,
  getCoreBusinessAuditAction
} from "./businessAuditCoverage";

describe("businessAuditCoverage", () => {
  it("covers core Media, Sales, Campaign, Finance, and Contract workflow actions", () => {
    expect(CORE_BUSINESS_AUDIT_ACTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "publisher.create", module: "Media", criticality: "P0" }),
        expect.objectContaining({
          action: "china_media_ecosystem.manual_review",
          module: "Media",
          criticality: "P0"
        }),
        expect.objectContaining({
          action: "china_media_ecosystem.score.apply",
          module: "Media",
          criticality: "P0"
        }),
        expect.objectContaining({
          action: "china_media_ecosystem.trusted_candidate.create",
          module: "Media",
          criticality: "P0"
        }),
        expect.objectContaining({ action: "proposal.approve", module: "Sales", criticality: "P0" }),
        expect.objectContaining({ action: "campaign.launch.approve", module: "Campaigns", criticality: "P0" }),
        expect.objectContaining({ action: "settlement.confirm", module: "Finance", criticality: "P0" }),
        expect.objectContaining({ action: "contract.sign", module: "Contracts", criticality: "P0" })
      ])
    );
  });

  it("looks up coverage by object type and action", () => {
    expect(getCoreBusinessAuditAction("settlement.payment.mark_paid", "settlement")).toMatchObject({
      module: "Finance",
      workflowSurface: "Finance Payment Confirmation"
    });
  });

  it("adds Phase 28 metadata to covered business audit events", () => {
    expect(
      buildBusinessAuditAfterData(
        {
          action: "publisher.sales_readiness.approve",
          objectType: "publisher",
          allowed: true,
          reasonCode: "PUBLISHER_SCALE_READY"
        },
        "media_director"
      )
    ).toMatchObject({
      allowed: true,
      reasonCode: "PUBLISHER_SCALE_READY",
      actorRole: "media_director",
      businessAuditCoverage: "phase28_core_business_action",
      businessModule: "Media",
      workflowAction: "publisher.sales_readiness.approve",
      criticality: "P0"
    });
  });

  it("keeps unknown audit events minimal", () => {
    expect(
      buildBusinessAuditAfterData({
        action: "route.visit",
        objectType: "route",
        allowed: true,
        reasonCode: "ROUTE_VISIT"
      })
    ).toEqual({
      allowed: true,
      reasonCode: "ROUTE_VISIT"
    });
  });
});
