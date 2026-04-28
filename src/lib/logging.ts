import type { JobMatch, SourceFailure } from "../features/scan/types";
import { file } from "bun";
import path from "node:path";

function parseLoggedMatches(parsed: unknown, filename: string): JobMatch[] {
  if (!Array.isArray(parsed)) {
    throw new Error(`Parsed ${filename} file is invalid!`);
  }

  const matches = parsed as JobMatch[];
  for (const match of matches) {
    if (
      typeof match?.posting?.url !== "string" ||
      typeof match?.posting?.title !== "string"
    ) {
      throw new Error(`Parsed ${filename} file is invalid!`);
    }
  }

  return matches;
}

/*
  Adds non-duplicate matches to the end of the old list.
*/
function mergeMatches(oldMatches: JobMatch[], newMatches: JobMatch[]) {
  const seenIds = new Set(oldMatches.map((m) => m.posting.id));
  return oldMatches.concat(
    newMatches.filter((m) => !seenIds.has(m.posting.id)),
  );
}

export async function recordMatches(matches: JobMatch[], logPath: string) {
  // load existing matches from data folder and dedupe, then add new matches and save back to file
  const matchFile = file(path.join(logPath, "matches.json"));

  const fileExists = await matchFile.exists();
  if (!fileExists) {
    // no existing matches so just write the new ones
    await matchFile.write(JSON.stringify(matches, null, 2));
    return;
  }

  const existingMatches = parseLoggedMatches(await matchFile.json(), "match");
  const merged = mergeMatches(existingMatches, matches);

  await matchFile.write(JSON.stringify(merged, null, 2));
}

export async function recordPostings(postings: JobMatch[], logPath: string) {
  const postingsFile = file(path.join(logPath, "postings.json"));

  const fileExists = await postingsFile.exists();
  if (!fileExists) {
    await postingsFile.write(JSON.stringify(postings, null, 2));
    return;
  }

  const existingPostings = parseLoggedMatches(
    await postingsFile.json(),
    "postings",
  );
  const merged = mergeMatches(existingPostings, postings);

  await postingsFile.write(JSON.stringify(merged, null, 2));
}

export async function loadPostingIds(logPath: string): Promise<Set<string>> {
  const postingsFile = file(path.join(logPath, "postings.json"));
  const fileExists = await postingsFile.exists();
  if (!fileExists) return new Set<string>();

  const seenPostingIds = new Set<string>();
  const existingPostings = parseLoggedMatches(
    await postingsFile.json(),
    "postings",
  );
  for (const match of existingPostings) {
    seenPostingIds.add(match.posting.id);
  }

  return seenPostingIds;
}

export async function recordFailures(
  failures: SourceFailure[],
  logPath: string,
) {
  // create file if doesn't exist, then just append errors
  const failureFile = file(path.join(logPath, "failures.json"));

  const fileExists = await failureFile.exists();
  if (!fileExists) {
    await failureFile.write(JSON.stringify(failures, null, 2));
    return;
  }

  // load JSON from file
  const parsed = (await failureFile.json()) as SourceFailure[];
  const combined = parsed.concat(failures);

  await failureFile.write(JSON.stringify(combined, null, 2));
}
