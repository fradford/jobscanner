import { load } from "cheerio";
import type { StaticSourceConfig, JobPosting } from "../types";
import type { SourceAdapter } from "./types";

export const staticAdapter: SourceAdapter<StaticSourceConfig> = {
  type: "static",
  async fetchJobs(source, context): Promise<JobPosting[]> {
    const html = await context.fetchText(source.url);
    const $ = load(html);
    const jobs: JobPosting[] = [];

    $(source.listingSelector).each((index, element) => {
      const root = $(element);
      const title = root.find(source.titleSelector).first().text().trim();
      const linkValue = root.find(source.linkSelector).first().attr("href");
      if (!title || !linkValue) return;

      const url = new URL(linkValue, source.url).toString();
      jobs.push({
        sourceId: source.id,
        sourceType: "static",
        externalId: `${source.id}:${index}:${url}`,
        title,
        company: source.company,
        location: source.locationSelector
          ? root.find(source.locationSelector).first().text().trim() ||
            undefined
          : undefined,
        workMode: "unknown",
        url,
        description: source.descriptionSelector
          ? root.find(source.descriptionSelector).first().text().trim() ||
            undefined
          : undefined,
      });
    });

    return jobs;
  },
};
