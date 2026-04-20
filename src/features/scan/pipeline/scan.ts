import { createFetchContext } from "../../../util/context";
import { dispatchAdapter } from "../adapters";
import {
  AllSourcesFailedError,
  type JobPosting,
  type JobScannerConfig,
  type ScanResult,
  type SourceFailure,
} from "../types";

/**
 * Removes duplicate job postings from the given list.
 * Postings with the same id are considered duplicates.
 * @param postings list of job postings to dedupe
 * @returns list of job postings with duplicates removed
 */
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

/**
 * Marks fetched job postings as seen before or new
 * @param postings list of job postings
 * @param seen list of previously seen posting ids
 */
function markSeenPostings(
  postings: JobPosting[],
  seen: Set<string>,
): JobPosting[] {
  return postings.map((post) => ({ ...post, isNew: !seen.has(post.id) }));
}

/**
 * Scans all enabled sources from the loaded config and fetches *all* job postings
 * @param config config object, likely loaded from file
 * @param seenPostings set of seen ids, if omitted, all postings will be marked as new
 * @returns ScanResult - list of postings and collected failures
 */
export async function scanAllSources(
  config: JobScannerConfig,
  seenPostings?: Set<string>,
): Promise<ScanResult> {
  const sources = config.sources.filter((x) => x.enabled);
  if (sources.length === 0) throw new Error("No sources enabled!");

  const postings: JobPosting[] = [];
  const failures: SourceFailure[] = [];
  const context = createFetchContext(config.request);

  // scan all sources and populate postings list
  await Promise.all(
    sources.map(async (source) => {
      try {
        const adapter = dispatchAdapter(source);
        const fetched = await adapter.fetchJobs(source, context);
        postings.push(...fetched);
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

  // throw error if no postings were correctly fetched
  if (postings.length === 0 && failures.length > 0)
    throw new AllSourcesFailedError(
      `All sources failed:\n${failures.map((f) => `- ${f.sourceId}: ${f.message}`).join("\n")}`,
      failures,
    );

  return {
    postings: markSeenPostings(
      dedupePostings(postings),
      seenPostings ?? new Set(),
    ),
    failures,
  };
}
