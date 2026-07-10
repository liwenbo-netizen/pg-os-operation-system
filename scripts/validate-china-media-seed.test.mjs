import { describe, expect, it } from "vitest";
import { validateChinaMediaSeedRows } from "./validate-china-media-seed.mjs";

function validRow(overrides = {}) {
  return {
    seed_id: "CNSM2024-0001",
    media_name: "爱奇艺",
    source_primary_segment_cn: "视频媒体",
    source_secondary_category_cn: "在线视频",
    pg_ecosystem_segment_code: "VIDEO_LONG_FORM",
    pg_ecosystem_segment_cn: "长视频 / 视频平台",
    media_type_initial: "APP/WEB",
    primary_scene_initial: "长视频观看",
    ad_formats_if_known: "视频贴片/信息流/开屏/暂停广告/品牌专区",
    potential_integration_methods: "SDK/API/VAST/RTB待确认",
    ecosystem_status: "ECOSYSTEM_MAPPED",
    verification_status: "UNVERIFIED",
    data_quality_level: "SEED_ONLY",
    trust_status: "NOT_VERIFIED",
    trusted_supply_candidate: "NO",
    deal_ready_status: "NOT_READY",
    recommended_trading_mode: "NEEDS_REVIEW",
    priority_level_seed: "B",
    owner_role_initial: "media_manager",
    owner_id: "",
    next_action: "分配Owner；补充主体、联系人、广告位、接入方式和商业化意向",
    forbidden_commitments:
      "不可保底;不可预付;不可低消;不可直接标记Sales Ready;不可直接创建Programmatic Guaranteed",
    trusted_supply_link_rule: "仅当联系人确认、合作兴趣确认、广告位识别、技术可行性非Impossible后，才可转Trusted Supply Candidate",
    pmp_trading_link_rule: "初始不可PMP；验证后可评估Preferred Deal或行业媒体包",
    source_name: "秒针营销科学院《中国数字媒介生态地图2024版》解读报告",
    source_version: "2024-7",
    source_file: "中国数字媒介生态地图2024版解读报告-秒针营销科学院-2024.7.pdf",
    source_page: 27,
    seed_confidence: "PARSED_TEXT",
    import_batch_id: "CN_MEDIA_MAP_2024_MAMS_V0_1",
    review_required: "FALSE",
    notes: "",
    ...overrides
  };
}

describe("China media seed validator", () => {
  it("accepts seed-only rows with safe defaults", () => {
    const result = validateChinaMediaSeedRows([validRow()], { expectedCount: 1 });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      totalRows: 1,
      segments: { VIDEO_LONG_FORM: 1 },
      priority: { B: 1 },
      confidence: { PARSED_TEXT: 1 },
      reviewRequired: { FALSE: 1 }
    });
  });

  it("blocks rows that try to enter trusted or deal-ready states", () => {
    const result = validateChinaMediaSeedRows(
      [
        validRow({
          trusted_supply_candidate: "YES",
          deal_ready_status: "READY",
          recommended_trading_mode: "PREFERRED_DEAL"
        })
      ],
      { expectedCount: 1 }
    );

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("trusted_supply_candidate=NO");
    expect(result.failures.join("\n")).toContain("deal_ready_status=NOT_READY");
    expect(result.failures.join("\n")).toContain("recommended_trading_mode=NEEDS_REVIEW");
  });

  it("rejects unsupported ecosystem segment codes and missing forbidden rules", () => {
    const result = validateChinaMediaSeedRows(
      [
        validRow({
          pg_ecosystem_segment_code: "AD_EXCHANGE",
          forbidden_commitments: "不可保底"
        })
      ],
      { expectedCount: 1 }
    );

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("unsupported pg_ecosystem_segment_code AD_EXCHANGE");
    expect(result.failures.join("\n")).toContain("不可预付");
  });
});

