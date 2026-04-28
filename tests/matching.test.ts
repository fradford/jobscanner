import { describe, expect, test } from "bun:test";
import type { JobPosting, MatchConfig } from "../features/scan/types";
import {
  scoreAllPostings,
  scorePosting,
} from "../features/scan/pipeline/score";
import { rankAllMatches } from "../features/scan/pipeline/rank";

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

  test("filters roles with disallowed seniority", () => {
    const result = scorePosting(
      posting({
        title: "Senior Backend Engineer",
        description: "typescript backend",
        seniority: "senior",
      }),
      { ...baseQuery, seniority: [{ level: "junior" }, { level: "mid" }] },
    );

    expect(result.filtered).toBe(true);
    expect(result.filterReason).toContain('seniority "senior" not allowed');
  });

  test("keeps roles with allowed seniority", () => {
    const result = scorePosting(
      posting({
        title: "Backend Engineer",
        description: "typescript backend",
        seniority: "mid",
      }),
      { ...baseQuery, seniority: [{ level: "junior" }, { level: "mid" }] },
    );

    expect(result.filtered).toBe(false);
  });

  test("keeps unknown seniority by default when seniority filter is set", () => {
    const result = scorePosting(
      posting({
        title: "Backend Engineer",
        description: "typescript backend",
        seniority: "unknown",
      }),
      { ...baseQuery, seniority: [{ level: "junior" }] },
    );

    expect(result.filtered).toBe(false);
  });

  test("adds a score boost for explicit seniority matches over unknown", () => {
    const query: MatchConfig = { ...baseQuery, seniority: [{ level: "mid" }] };
    const matched = scorePosting(
      posting({
        description: "typescript backend",
        seniority: "mid",
      }),
      query,
    );
    const unknown = scorePosting(
      posting({
        externalId: "2",
        url: "https://example.com/jobs/2",
        description: "typescript backend",
        seniority: "unknown",
      }),
      query,
    );

    expect(matched.filtered).toBe(false);
    expect(unknown.filtered).toBe(false);
    expect(matched.score).toBeGreaterThan(unknown.score);
  });

  test("applies configurable seniority bonuses per level", () => {
    const query: MatchConfig = {
      ...baseQuery,
      seniority: [
        { level: "junior", bonus: 40 },
        { level: "mid", bonus: 15 },
      ],
    };

    const junior = scorePosting(
      posting({
        externalId: "1",
        url: "https://example.com/jobs/1",
        description: "typescript backend",
        seniority: "junior",
      }),
      query,
    );
    const mid = scorePosting(
      posting({
        externalId: "2",
        url: "https://example.com/jobs/2",
        description: "typescript backend",
        seniority: "mid",
      }),
      query,
    );
    const unknown = scorePosting(
      posting({
        externalId: "3",
        url: "https://example.com/jobs/3",
        description: "typescript backend",
        seniority: "unknown",
      }),
      query,
    );

    expect(junior.filtered).toBe(false);
    expect(mid.filtered).toBe(false);
    expect(unknown.filtered).toBe(false);
    expect(junior.score).toBeGreaterThan(mid.score);
    expect(mid.score).toBeGreaterThan(unknown.score);
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

  test("rankPostings puts matched seniority above unknown when other signals are equal", () => {
    const scored = scoreAllPostings(
      [
        posting({
          externalId: "1",
          url: "https://example.com/jobs/1",
          description: "typescript backend",
          seniority: "mid",
        }),
        posting({
          externalId: "2",
          url: "https://example.com/jobs/2",
          description: "typescript backend",
          seniority: "unknown",
        }),
      ],
      {
        ...baseQuery,
        seniority: [{ level: "mid" }],
      },
    );

    const ranked = rankAllMatches(scored);
    expect(ranked[0]?.posting.externalId).toBe("1");
  });
});
