import { describe, expect, test } from "bun:test";
import { fillPostingDetails } from "../features/scan/pipeline/extract";
import type { JobPosting } from "../features/scan/types";

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

describe("fillPostingDetails", () => {
  test("detects seniority from job title", () => {
    const detailed = fillPostingDetails(
      posting({
        title: "Senior Backend Engineer",
      }),
    );

    expect(detailed.seniority).toBe("senior");
  });

  test("prioritizes title seniority over description", () => {
    const detailed = fillPostingDetails(
      posting({
        title: "Junior Backend Engineer",
        description: "This is a senior role focused on backend systems.",
      }),
    );

    expect(detailed.seniority).toBe("junior");
  });

  test("avoids inferring seniority from collaboration context", () => {
    const detailed = fillPostingDetails(
      posting({
        description: "Work with senior engineers to deliver backend systems.",
      }),
    );

    expect(detailed.seniority).toBe("unknown");
  });

  test("detects seniority from explicit role statements in description", () => {
    const detailed = fillPostingDetails(
      posting({
        description: "The position is senior and focuses on backend services.",
      }),
    );

    expect(detailed.seniority).toBe("senior");
  });

  test("infers mid seniority from 4+ years of experience", () => {
    const detailed = fillPostingDetails(
      posting({
        description: "Requirements: 4+ years of experience with backend APIs.",
      }),
    );

    expect(detailed.seniority).toBe("mid");
  });

  test("infers senior seniority from 8+ years of experience", () => {
    const detailed = fillPostingDetails(
      posting({
        description:
          "Minimum 8 years of experience building distributed backend systems.",
      }),
    );

    expect(detailed.seniority).toBe("senior");
  });

  test("infers senior seniority from 'at least 5+ years of relevant experience'", () => {
    const detailed = fillPostingDetails(
      posting({
        description: "You have at least 5+ years of relevant experience.",
      }),
    );

    expect(detailed.seniority).toBe("senior");
  });

  test("prioritizes explicit description labels over experience-years heuristic", () => {
    const detailed = fillPostingDetails(
      posting({
        description:
          "This is a junior role. Requirements include 6+ years of experience.",
      }),
    );

    expect(detailed.seniority).toBe("junior");
  });

  test("ignores numeric counts that are not years-of-experience requirements", () => {
    const detailed = fillPostingDetails(
      posting({
        description: "Work with 4+ engineers to deliver backend systems.",
      }),
    );

    expect(detailed.seniority).toBe("unknown");
  });

  test("uses higher precedence levels when multiple labels appear", () => {
    const detailed = fillPostingDetails(
      posting({
        title: "Staff Software Engineer (Senior)",
      }),
    );

    expect(detailed.seniority).toBe("staff");
  });
});
