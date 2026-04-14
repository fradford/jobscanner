import type { GreenhouseSourceConfig, JobPosting } from "../types";
import type { SourceAdapter } from "./types";

interface GreenhouseResponse {
  jobs: Array<{
    id: number;
    title: string;
    location?: { name?: string };
    absolute_url: string;
    updated_at?: string;
    content?: string;
  }>;
}

export const greenhouseAdapter: SourceAdapter<GreenhouseSourceConfig> = {
  type: "greenhouse",
  async fetchJobs(source, context): Promise<JobPosting[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${source.boardToken}/jobs?content=true`;
    const payload = await context.fetchJson<GreenhouseResponse>(url);

    return payload.jobs.map((job) => ({
      sourceId: source.id,
      sourceType: "greenhouse",
      externalId: String(job.id),
      title: job.title,
      company: source.boardToken,
      location: job.location?.name,
      workMode: "unknown",
      url: job.absolute_url,
      postedAt: job.updated_at,
    }));
  },
};
