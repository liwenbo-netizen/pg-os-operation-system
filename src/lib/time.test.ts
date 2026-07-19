import { describe, expect, it } from "vitest";
import { formatUtcPlus8Date, formatUtcPlus8DateTime } from "./time";

describe("formatUtcPlus8DateTime", () => {
  it("renders UTC timestamps as fixed UTC+8 display time", () => {
    expect(formatUtcPlus8DateTime("2026-07-02T01:29:48.243Z")).toBe("2026-07-02 09:29:48 UTC+8");
    expect(formatUtcPlus8DateTime("2026-07-01T03:20:26.517+00:00")).toBe("2026-07-01 11:20:26 UTC+8");
  });

  it("rolls dates across the UTC day boundary", () => {
    expect(formatUtcPlus8DateTime("2026-07-01T20:30:00.000Z")).toBe("2026-07-02 04:30:00 UTC+8");
  });

  it("returns a neutral placeholder for missing or invalid values", () => {
    expect(formatUtcPlus8DateTime(undefined)).toBe("-");
    expect(formatUtcPlus8DateTime("not-a-date")).toBe("-");
  });

  it("returns the UTC+8 calendar date across a UTC day boundary", () => {
    expect(formatUtcPlus8Date("2026-07-19T17:00:00.000Z")).toBe("2026-07-20");
    expect(formatUtcPlus8Date("not-a-date")).toBe("");
  });
});
