import type { JobMatch } from "../types";
import { file } from "bun";

/*
  Adds non-duplicate matches to the end of the old list.
  Something like O(m*n), not ideal but should be fine
*/
function mergeMatches(oldMatches: JobMatch[], newMatches: JobMatch[]) {
  const merged = Array.from(oldMatches);
  for (const match of newMatches) {
    const newKey = `${match.posting.url}::${match.posting.title.toLowerCase()}`;
    let duplicate = false;

    for (const old of oldMatches) {
      const oldKey = `${old.posting.url}::${old.posting.title.toLowerCase()}`;

      if (newKey === oldKey) {
        duplicate = true;
        break;
      }
    }

    if (!duplicate) {
      merged.push(match);
    }
  }

  return merged;
}

export async function recordMatches(matches: JobMatch[], matchesPath: string) {
  // load existing matches from data folder and dedupe, then add new matches and save back to file
  const matchFile = file(matchesPath);

  const fileExists = await matchFile.exists();
  if (!fileExists) {
    // no existing matches so just write the new ones
    matchFile.write(JSON.stringify(matches, null, 2));
    return;
  }

  const parsed = await matchFile.json();

  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error("Parsed match file is invalid! This shouldn't happen :(");

  const existingMatches = parsed as JobMatch[];
  const merged = mergeMatches(existingMatches, matches);

  await matchFile.write(JSON.stringify(merged, null, 2));
}
