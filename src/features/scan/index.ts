import { fillAllPostingDetails } from "./pipeline/extract";
import { rankAllMatches } from "./pipeline/rank";
import { scanAllSources } from "./pipeline/scan";
import { scoreAllPostings } from "./pipeline/score";
import type { JobMatch, JobScannerConfig, ScanMatchResult } from "./types";

function limitMatches(matches: JobMatch[], maxResults?: number): JobMatch[] {
  if (!maxResults || maxResults <= 0) return matches;
  return matches.slice(0, maxResults);
}

export async function runScanPipeline(
  config: JobScannerConfig,
  seenPostings?: Set<string>,
): Promise<ScanMatchResult> {
  const scanResult = await scanAllSources(config, seenPostings);
  const detailedJobs = fillAllPostingDetails(scanResult.postings);
  const scoredJobs = scoreAllPostings(detailedJobs, config.match);
  const rankedJobs = rankAllMatches(scoredJobs);
  const matchedJobs = limitMatches(rankedJobs, config.output?.maxResults);

  return {
    matches: matchedJobs,
    allPostings: rankedJobs,
    failures: scanResult.failures,
  };
}
