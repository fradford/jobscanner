import { dispatchAdapter } from "./adapters";
import { scorePostings, rankPostings } from "./matching";
import {
  type ScanResult,
  type JobScannerConfig,
  type JobPosting,
  type JobMatch,
  AllSourcesFailedError,
} from "./types";
import { createFetchContext } from "./util/context";

export interface RunScanOptions {
  seenPostings?: Set<string>;
}

function dedupePostings(postings: JobPosting[]): JobPosting[] {
  const seen = new Set<string>();
  const unique: JobPosting[] = [];
  for (const posting of postings) {
    if (seen.has(posting.id)) continue;
    seen.add(posting.id);
    unique.push(posting);
  }
  return unique;
}

function limitMatches(matches: JobMatch[], maxResults?: number): JobMatch[] {
  if (!maxResults || maxResults <= 0) return matches;
  return matches.slice(0, maxResults);
}

/*
  Scans all enabled sources from the given config file.

  return:
  - matches: ranked job matches
  - failures: collected source fetching failures
*/
export async function runScan(
  config: JobScannerConfig,
  options: RunScanOptions = {},
): Promise<ScanResult> {
  const sources = config.sources.filter((source) => source.enabled);
  if (sources.length === 0) throw new Error("No sources enabled!");

  const allPostings: JobPosting[] = [];
  const failures: ScanResult["failures"] = [];

  const context = createFetchContext(config.request);

  await Promise.all(
    sources.map(async (source) => {
      try {
        const adapter = dispatchAdapter(source);
        const postings = await adapter.fetchJobs(source, context);
        allPostings.push(...postings);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown source failure";
        const trace = error instanceof Error ? error.stack : undefined;
        failures.push({
          sourceId: source.id,
          message,
          timestamp: new Date(),
          trace,
        });
      }
    }),
  );

  if (allPostings.length === 0 && failures.length > 0) {
    throw new AllSourcesFailedError(
      `All sources failed:\n${failures.map((f) => `- ${f.sourceId}: ${f.message}`).join("\n")}`,
      failures,
    );
  }

  const dedupedPostings = dedupePostings(allPostings).map((posting) => ({
    ...posting,
    isNew: !options.seenPostings?.has(posting.id),
  }));
  const scoredPostings = scorePostings(dedupedPostings, config.query);
  const ranked = rankPostings(scoredPostings);
  const matches = limitMatches(ranked, config.output?.maxResults);

  return {
    scoredPostings,
    matches,
    failures,
  };
}
