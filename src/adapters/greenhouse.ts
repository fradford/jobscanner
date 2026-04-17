import type { GreenhouseSourceConfig, JobPosting } from "../types";
import type { SourceAdapter } from "./types";
import cc, { type CurrencyCodeRecord } from "currency-codes";
import { sanitizeString } from "../util/format";

interface GreenhouseJobsDTO {
  jobs: Array<{
    id: number;
  }>;
}

interface GreenhouseJobDetailsDTO {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  updated_at: string;
  content: string;
  pay_input_ranges: Array<{
    min_cents: number;
    max_cents: number;
    currency_type: string;
  }>;
}

export const greenhouseAdapter: SourceAdapter<GreenhouseSourceConfig> = {
  type: "greenhouse",
  async fetchJobs(source, context): Promise<JobPosting[]> {
    // greenhouse api has list endpoint plus detailed endpoint, salary range is optional on detailed endpoint, not included in list
    // will have to send a request for each job which is where throttling comes in so we don't get blocked
    const url = `https://boards-api.greenhouse.io/v1/boards/${source.boardToken}/jobs`;
    const payload = await context.fetchJson<GreenhouseJobsDTO>(url);

    return await Promise.all(
      payload.jobs.map(async (job) => {
        const url = `https://boards-api.greenhouse.io/v1/boards/${source.boardToken}/jobs/${job.id}?pay_transparency=true`;

        const jobDetails =
          await context.fetchJson<GreenhouseJobDetailsDTO>(url);
        return {
          id: `${jobDetails.absolute_url}::${sanitizeString(jobDetails.title.toLowerCase())}`,
          sourceId: source.id,
          sourceType: "greenhouse",
          externalId: String(job.id),
          title: jobDetails.title,
          company: source.company,
          location: jobDetails.location?.name,
          workMode: "unknown",
          salaryBands: jobDetails.pay_input_ranges.map((band) => ({
            bottom: Math.floor(band.min_cents / 100),
            top: Math.floor(band.max_cents / 100),
            currency: cc.code(band.currency_type) as CurrencyCodeRecord,
          })),
          url: jobDetails.absolute_url,
          description: jobDetails.content,
        };
      }),
    );
  },
};
