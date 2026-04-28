import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { recordPostings, loadPostingIds } from "../lib/logging";
import type { JobMatch } from "../features/scan/types";

const tempDirs: string[] = [];

function makeMatch(
  externalId: string,
  url: string,
  options?: Partial<JobMatch>,
): JobMatch {
  return {
    posting: {
      id: `${url}::role${externalId}`,
      sourceType: "greenhouse",
      externalId,
      title: `Role ${externalId}`,
      company: "Acme",
      workMode: "remote",
      url,
    },
    score: 10,
    matchedKeywords: ["backend"],
    filtered: false,
    ...options,
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("recordPostings", () => {
  test("creates postings.json when it does not exist", async () => {
    const logPath = await mkdtemp(path.join(os.tmpdir(), "jobscanner-logs-"));
    tempDirs.push(logPath);

    const postings = [makeMatch("1", "https://example.com/jobs/1")];
    await recordPostings(postings, logPath);

    const content = await readFile(path.join(logPath, "postings.json"), "utf8");
    expect(JSON.parse(content)).toHaveLength(1);
  });

  test("dedupes by url and title when appending", async () => {
    const logPath = await mkdtemp(path.join(os.tmpdir(), "jobscanner-logs-"));
    tempDirs.push(logPath);

    await recordPostings(
      [makeMatch("1", "https://example.com/jobs/1")],
      logPath,
    );
    await recordPostings(
      [
        makeMatch("2", "https://example.com/jobs/1", {
          posting: {
            id: "https://example.com/jobs/1::role1",
            sourceType: "greenhouse",
            externalId: "2",
            title: "Role 1",
            company: "Acme",
            workMode: "remote",
            url: "https://example.com/jobs/1",
          },
        }),
        makeMatch("3", "https://example.com/jobs/3"),
      ],
      logPath,
    );

    const content = await readFile(path.join(logPath, "postings.json"), "utf8");
    expect(JSON.parse(content)).toHaveLength(2);
  });
});

describe("loadSeenPostingKeys", () => {
  test("returns an empty set when postings.json does not exist", async () => {
    const logPath = await mkdtemp(path.join(os.tmpdir(), "jobscanner-logs-"));
    tempDirs.push(logPath);

    const seen = await loadPostingIds(logPath);
    expect(seen.size).toBe(0);
  });

  test("loads seen posting keys from postings.json", async () => {
    const logPath = await mkdtemp(path.join(os.tmpdir(), "jobscanner-logs-"));
    tempDirs.push(logPath);

    await recordPostings(
      [
        makeMatch("1", "https://example.com/jobs/1"),
        makeMatch("2", "https://example.com/jobs/2"),
      ],
      logPath,
    );

    const seen = await loadPostingIds(logPath);
    expect(seen.has("https://example.com/jobs/1::role1")).toBe(true);
    expect(seen.has("https://example.com/jobs/2::role2")).toBe(true);
  });
});
