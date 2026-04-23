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
    expect(output).not.toContain("posted ");
  });

  test("shows posted hours ago for jobs posted today", () => {
    const now = new Date(2026, 3, 23, 15, 0, 0);
    const output = formatScanResult(
      {
        matches: [match({ posting: { postedAt: new Date(2026, 3, 23, 10, 0, 0) } })],
        allPostings: [],
        failures: [],
      },
      now,
    );

    expect(output).toContain("posted 5 hours ago");
  });

  test("shows posted days ago for jobs in the last 30 days", () => {
    const now = new Date(2026, 3, 23, 15, 0, 0);
    const output = formatScanResult(
      {
        matches: [match({ posting: { postedAt: new Date(2026, 3, 20, 9, 0, 0) } })],
        allPostings: [],
        failures: [],
      },
      now,
    );

    expect(output).toContain("posted 3 days ago");
  });

  test("shows full date for jobs older than 30 days", () => {
    const now = new Date(2026, 3, 23, 15, 0, 0);
    const output = formatScanResult(
      {
        matches: [match({ posting: { postedAt: new Date(2026, 2, 20, 9, 0, 0) } })],
        allPostings: [],
        failures: [],
      },
      now,
    );

    expect(output).toContain("posted 2026-03-20");
  });
});
