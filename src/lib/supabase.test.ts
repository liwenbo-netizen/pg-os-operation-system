import { describe, expect, it } from "vitest";
import { normalizeSupabaseProjectUrl } from "./supabase";

describe("normalizeSupabaseProjectUrl", () => {
  it("keeps a Supabase project root URL unchanged", () => {
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co")).toBe("https://example.supabase.co");
  });

  it("removes Supabase service API paths before createClient receives the URL", () => {
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co/rest/v1/")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co/auth/v1")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseProjectUrl("https://example.supabase.co/functions/v1?x=1#hash")).toBe(
      "https://example.supabase.co"
    );
  });

  it("returns an empty string for missing values and preserves unparsable values for visibility", () => {
    expect(normalizeSupabaseProjectUrl(undefined)).toBe("");
    expect(normalizeSupabaseProjectUrl("")).toBe("");
    expect(normalizeSupabaseProjectUrl("not-a-url")).toBe("not-a-url");
  });
});
