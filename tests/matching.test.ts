import { describe, expect, test } from "bun:test";
import { rankPostings, scorePosting } from "../src/matching";
import type { JobPosting, QueryConfig } from "../src/types";

const baseQuery: QueryConfig = {
  includeKeywords: ["backend", "typescript"],
};

function posting(overrides: Partial<JobPosting>): JobPosting {
  return {
    sourceType: "greenhouse",
    externalId: "1",
    title: "Backend Engineer",
    company: "Acme",
    workMode: "unknown",
    url: "https://example.com/jobs/1",
    ...overrides,
  };
}

describe("matching", () => {
  test("filters excluded keywords", () => {
    const result = scorePosting(
      posting({ description: "Senior backend role with leadership scope" }),
      { ...baseQuery, excludeKeywords: ["leadership"] },
    );

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toContain("excluded keyword");
  });

  test("filters non-remote roles when remoteOnly is set", () => {
    const result = scorePosting(
      posting({ title: "Backend Engineer", description: "Great onsite role" }),
      { ...baseQuery, remoteOnly: true },
    );

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toBe("non-remote role");
  });

  test("ranks by score with location bonus", () => {
    const query: QueryConfig = {
      ...baseQuery,
      locations: ["toronto"],
    };

    const matches = rankPostings(
      [
        posting({
          externalId: "1",
          title: "Backend TypeScript Engineer",
          location: "Toronto, ON",
          url: "https://example.com/jobs/1",
        }),
        posting({
          externalId: "2",
          title: "Backend Engineer",
          location: "Remote",
          url: "https://example.com/jobs/2",
        }),
      ],
      query,
    );

    expect(matches[0]?.posting.externalId).toBe("1");
    expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 0);
  });
});
