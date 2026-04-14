import { afterEach, describe, expect, mock, test } from "bun:test";
import { runScan } from "../src/scan";
import type { JobScannerConfig } from "../src/types";

const originalFetch = globalThis.fetch;

const baseConfig: JobScannerConfig = {
  query: {
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

    const result = await runScan(baseConfig);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.posting.url).toBe("https://example.com/jobs/1");
    expect(result.failures).toHaveLength(0);
  });

  test("throws when all sources fail", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("oops", { status: 500, statusText: "Server Error" });
    }) as unknown as typeof fetch;

    await expect(runScan(baseConfig)).rejects.toThrow("All sources failed");
  });
});
