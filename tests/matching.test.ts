import { describe, expect, test } from "bun:test";
import type { JobPosting, MatchConfig } from "../src/features/scan/types";
import {
  scoreAllPostings,
  scorePosting,
} from "../src/features/scan/pipeline/score";
import { rankAllMatches } from "../src/features/scan/pipeline/rank";

const baseQuery: MatchConfig = {
  includeKeywords: ["backend", "typescript"],
};

function posting(overrides: Partial<JobPosting>): JobPosting {
  return {
    id: "https://example.com/jobs/1::backendengineer",
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

  test("scorePostings returns filtered and unfiltered results", () => {
    const query: MatchConfig = {
      ...baseQuery,
      excludeKeywords: ["manager"],
    };
    const scored = scoreAllPostings(
      [
        posting({
          externalId: "1",
          title: "Backend Engineer",
          description: "typescript backend",
          url: "https://example.com/jobs/1",
        }),
        posting({
          externalId: "2",
          title: "Engineering Manager",
          description: "backend leadership",
          url: "https://example.com/jobs/2",
        }),
      ],
      query,
    );

    expect(scored).toHaveLength(2);
    expect(scored.some((match) => match.filtered)).toBe(true);
  });

  test("rankPostings removes filtered postings and sorts", () => {
    const scored = scoreAllPostings(
      [
        posting({
          externalId: "1",
          title: "Backend TypeScript Engineer",
          location: "Toronto, ON",
          url: "https://example.com/jobs/1",
        }),
        posting({
          externalId: "2",
          title: "Engineering Manager",
          description: "backend leadership",
          url: "https://example.com/jobs/2",
        }),
      ],
      {
        ...baseQuery,
        excludeKeywords: ["manager"],
        locations: ["toronto"],
      },
    );

    const ranked = rankAllMatches(scored);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.posting.externalId).toBe("1");
  });
});
