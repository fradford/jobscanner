import { afterEach, describe, expect, mock, test } from "bun:test";
import type { JobScannerConfig } from "../features/scan/types";
import { runScanPipeline } from "../features/scan";

const originalFetch = globalThis.fetch;

const baseConfig: JobScannerConfig = {
  match: {
    includeKeywords: ["backend"],
  },
  request: {
    throttleMs: 0,
  },
  output: {
    maxResults: 1,
  },
  sources: [
    {
      company: "Example Co",
      type: "static",
      id: "static:test",
      enabled: true,
      url: "https://example.com/jobs",
      listingSelector: ".job",
      titleSelector: ".title",
      linkSelector: "a",
      descriptionSelector: ".desc",
    },
  ],
};

afterEach(() => {
  mock.restore();
  globalThis.fetch = originalFetch;
});

describe("runScan", () => {
  test("dedupes and applies maxResults", async () => {
    globalThis.fetch = mock(async () => {
      const html =
        '<div class="job"><span class="title">Backend Engineer</span><a href="/jobs/1">job</a><span class="desc">backend</span></div>' +
        '<div class="job"><span class="title">Backend Engineer</span><a href="/jobs/1">job</a><span class="desc">backend</span></div>' +
        '<div class="job"><span class="title">Backend Developer</span><a href="/jobs/2">job</a><span class="desc">backend</span></div>';
      return new Response(html, { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runScanPipeline(baseConfig);

    expect(result.allPostings).toHaveLength(2);
    expect(result.allPostings.every((posting) => !posting.filtered)).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.posting.url).toBe("https://example.com/jobs/1");
    expect(result.failures).toHaveLength(0);
  });

  test("marks postings as new based on seen posting keys", async () => {
    globalThis.fetch = mock(async () => {
      const html =
        '<div class="job"><span class="title">Backend Engineer</span><a href="/jobs/1">job</a><span class="desc">backend</span></div>' +
        '<div class="job"><span class="title">Backend Developer</span><a href="/jobs/2">job</a><span class="desc">backend</span></div>';
      return new Response(html, { status: 200 });
    }) as unknown as typeof fetch;

    const seenPostings = new Set<string>([
      "https://example.com/jobs/1::backend engineer",
    ]);
    const result = await runScanPipeline(baseConfig, seenPostings);

    const byUrl = new Map(
      result.allPostings.map((match) => [match.posting.url, match]),
    );
    expect(byUrl.get("https://example.com/jobs/1")?.posting.isNew).toBe(false);
    expect(byUrl.get("https://example.com/jobs/2")?.posting.isNew).toBe(true);
  });

  test("throws when all sources fail", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("oops", { status: 500, statusText: "Server Error" });
    }) as unknown as typeof fetch;

    expect(runScanPipeline(baseConfig)).rejects.toThrow("All sources failed");
  });
});
