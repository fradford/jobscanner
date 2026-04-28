import type { JobMatch } from "../types";

export function rankAllMatches(matches: JobMatch[]): JobMatch[] {
  return matches
    .filter((match) => !match.filtered)
    .sort((a, b) => b.score - a.score);
}
