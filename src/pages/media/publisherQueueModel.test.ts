import { describe, expect, it } from "vitest";
import { filterAndSortPublisherQueue } from "./publisherQueueModel";
import type { Publisher } from "../../types/domain";

function publisher(overrides: Partial<Publisher> & Pick<Publisher, "id" | "name">): Publisher {
  return {
    technical_live_status: "draft",
    commercial_test_status: "not_started",
    sales_scale_status: "not_allowed",
    risk_level: "medium",
    ...overrides
  };
}

describe("publisher queue model", () => {
  const publishers = [
    publisher({
      id: "publisher-a",
      name: "Alpha Media",
      updated_at: "2026-07-20T08:00:00.000Z",
      metadata: { property_name: "Alpha News", property_identifier: "com.example.alpha" }
    }),
    publisher({
      id: "publisher-b",
      name: "Beta Media",
      sales_scale_status: "scale_ready",
      updated_at: "2026-07-22T08:00:00.000Z",
      metadata: { property_name: "Beta Video", property_identifier: "com.example.beta" }
    }),
    publisher({
      id: "publisher-c",
      name: "Gamma Media",
      updated_at: "2026-07-21T08:00:00.000Z",
      metadata: { property_name: "Campus Audio", property_identifier: "com.example.gamma" }
    })
  ];

  it("searches publisher name, property name, and property identifier", () => {
    expect(filterAndSortPublisherQueue(publishers, { query: "campus", status: "all", sort: "recent" }).map((item) => item.id)).toEqual(["publisher-c"]);
    expect(filterAndSortPublisherQueue(publishers, { query: "com.example.beta", status: "all", sort: "recent" }).map((item) => item.id)).toEqual(["publisher-b"]);
  });

  it("filters readiness status and sorts recent updates first", () => {
    expect(filterAndSortPublisherQueue(publishers, { query: "", status: "all", sort: "recent" }).map((item) => item.id)).toEqual([
      "publisher-b",
      "publisher-c",
      "publisher-a"
    ]);
    expect(filterAndSortPublisherQueue(publishers, { query: "", status: "scale_ready", sort: "recent" }).map((item) => item.id)).toEqual(["publisher-b"]);
  });

  it("supports alphabetical sorting", () => {
    expect(filterAndSortPublisherQueue(publishers, { query: "", status: "all", sort: "name" }).map((item) => item.name)).toEqual([
      "Alpha Media",
      "Beta Media",
      "Gamma Media"
    ]);
  });
});
