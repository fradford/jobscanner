import type { JobPosting, JobSourceConfig } from "../types";
import type { FetchContext } from "../../../lib/types";

export interface SourceAdapter<T extends JobSourceConfig> {
  type: T["type"];
  fetchJobs: (source: T, context: FetchContext) => Promise<JobPosting[]>;
}
