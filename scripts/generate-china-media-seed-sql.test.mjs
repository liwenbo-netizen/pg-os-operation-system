import { describe, expect, it } from "vitest";
import { buildChinaMediaSeedSql } from "./generate-china-media-seed-sql.mjs";

function validRow() {
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
    notes: ""
  };
}

describe("China media seed SQL generator", () => {
  it("generates a controlled upsert into the ecosystem opportunity pool", () => {
    const sql = buildChinaMediaSeedSql([validRow()], { expectedCount: 1 });

    expect(sql).toContain("insert into public.media_ecosystem_opportunities");
    expect(sql).toContain("on conflict (seed_id) do update");
    expect(sql).toContain("insert into public.media_ecosystem_conversion_logs");
    expect(sql).toContain("'seed_import'");
    expect(sql).toContain("'UNSCORED'");
    expect(sql).toContain("false");
  });

  it("does not write publisher, trusted supply, or deal tables", () => {
    const sql = buildChinaMediaSeedSql([validRow()], { expectedCount: 1 }).toLowerCase();

    expect(sql).not.toContain("insert into public.publishers");
    expect(sql).not.toContain("insert into public.trusted_supply_candidates");
    expect(sql).not.toContain("insert into public.proposals");
    expect(sql).not.toContain("insert into public.campaigns");
  });
});

