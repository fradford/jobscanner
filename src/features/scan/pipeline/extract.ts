import type { JobPosting, SalaryBand, WorkMode } from "../types";
import cc from "currency-codes";

// TODO: These functions are classic NLP use-cases, might be fun to build a model for this in the future

/**
 * Attempts to detect the location of the job from the content of a job posting
 * This function probably isn't very reliable, so try to pull location at the scan stage
 * @param posting
 * @returns
 */
function detectLocation(posting: JobPosting): string {
  if (posting.location !== undefined && posting.location !== "")
    return posting.location;
  const haystack = [posting.title, posting.company, posting.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // sort country names by length to avoid partial matches
  const locationRegex = new RegExp(
    `\\b${cc
      .countries()
      .sort((a, b) => b.length - a.length)
      .join("|")}\\b`,
    "i",
  );

  return haystack.match(locationRegex)?.[0] ?? "";
}

/**
 * Attempts to detect the work mode (on-site, hybrid, remote) from the content of a job posting
 * @param posting job posting data
 * @returns detected workmode
 */
function detectWorkMode(posting: JobPosting): WorkMode {
  if (posting.workMode !== "unknown") return posting.workMode;
  const haystack = [
    posting.title,
    posting.company,
    posting.location,
    posting.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("remote")) return "remote";
  if (haystack.includes("hybrid")) return "hybrid";

  // assume the job is on-site in the absence of "remote" or "hybrid" keywords
  return "onsite";
}

/**
 * Attempts to detect salary from the content of a job posting
 * @param posting job posting data
 * @returns detected salary bands, list may be empty
 */
function detectSalary(posting: JobPosting): SalaryBand[] {
  const haystack = [
    posting.title,
    posting.company,
    posting.location,
    posting.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const salaryRegex =
    /(?:salary|compensation|pay|wage|rate)[^\n]{0,60}(?<min>[\d,]+)\s*[-–—]\s*(?<max>[\d,]+)/gi;
  const matches = [...haystack.matchAll(salaryRegex)];
  const ranges = matches.map((match) => ({
    min: parseInt(match.groups?.min?.replace(/,/g, "") ?? "0"),
    max: parseInt(match.groups?.max?.replace(/,/g, "") ?? "0"),
  }));

  // detecting currency is a bit tricky, approach here is to first look for a standard currency code (eg USD, CAD)
  // and if we don't find one, look for a country name anywhere in the job posting and guess currency based on that
  // there's a chance this still misses, some postings only list city and state and assume you know the country
  const currencyRegex = new RegExp(
    `\\b(?<currency>${cc.codes().join("|")})\\b`,
    "i",
  );
  let currency = cc.code(haystack.match(currencyRegex)?.groups?.currency ?? "");
  if (typeof currency === "undefined") {
    for (const country of cc.countries()) {
      if (haystack.includes(country)) {
        // probably safe to assume the first currency is the most relevant
        currency = cc.country(country)[0];
      }
    }
  }

  // if we couldn't find a currency, ranges are probably invalid
  if (typeof currency === "undefined") return [];

  return ranges.map((range) => ({
    bottom: range.min,
    top: range.max,
    currency,
  }));
}

export function fillPostingDetails(posting: JobPosting): JobPosting {
  if (posting.location === undefined || posting.location === "") {
    posting.location = detectLocation(posting);
  }
  if (posting.workMode === "unknown") {
    posting.workMode = detectWorkMode(posting);
  }
  if (posting.salaryBands === undefined || posting.salaryBands.length === 0) {
    posting.salaryBands = detectSalary(posting);
  }

  return posting;
}

export function fillAllPostingDetails(postings: JobPosting[]): JobPosting[] {
  return postings.map(fillPostingDetails);
}
