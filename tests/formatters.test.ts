import { describe, expect, test } from "bun:test";
import type { JobMatch } from "../src/features/scan/types";
import { formatScanResult } from "../src/util/formatters";

function match(overrides?: Partial<JobMatch>): JobMatch {
  return {
    posting: {
      id: "https://example.com/jobs/1::backendengineer",
      sourceType: "greenhouse",
      externalId: "1",
      title: "Backend Engineer",
      company: "Acme",
      workMode: "remote",
      url: "https://example.com/jobs/1",
      ...overrides?.posting,
    },
    score: 23,
    matchedKeywords: ["backend"],
    filtered: false,
    ...overrides,
  };
}

describe("formatScanResult", () => {
  test("shows detected seniority in match output", () => {
    const output = formatScanResult({
      matches: [match({ posting: { seniority: "mid" } })],
      allPostings: [],
      failures: [],
    });

    expect(output).toContain("seniority: mid");
  });

  test("shows unknown when posting seniority is missing", () => {
    const output = formatScanResult({
      matches: [match()],
      allPostings: [],
      failures: [],
    });

    expect(output).toContain("seniority: unknown");
  });
});
