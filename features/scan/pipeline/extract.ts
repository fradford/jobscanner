import type { JobPosting, SalaryBand, Seniority, WorkMode } from "../types";
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

const SENIORITY_PRECEDENCE: ReadonlyArray<Exclude<Seniority, "unknown">> = [
  "executive",
  "director",
  "manager",
  "principal",
  "staff",
  "lead",
  "senior",
  "mid",
  "junior",
  "intern",
];

const SENIORITY_KEYWORDS: Readonly<
  Record<Exclude<Seniority, "unknown">, RegExp[]>
> = {
  executive: [
    /\bchief\b/i,
    /\bvice president\b/i,
    /\bvp\b/i,
    /\bcto\b/i,
    /\bceo\b/i,
    /\bcfo\b/i,
    /\bcio\b/i,
    /\bcoo\b/i,
  ],
  director: [/\bdirector\b/i],
  manager: [/\bmanager\b/i, /\bhead of\b/i],
  principal: [/\bprincipal\b/i],
  staff: [/\bstaff\b/i],
  lead: [
    /\btech lead\b/i,
    /\bteam lead\b/i,
    /\blead (?:engineer|developer|architect|designer|scientist|manager)\b/i,
  ],
  senior: [/\bsenior\b/i, /\bsr\.?\b/i],
  mid: [/\bmid[-\s]?level\b/i, /\bintermediate\b/i],
  junior: [
    /\bjunior\b/i,
    /\bjr\.?\b/i,
    /\bentry[-\s]?level\b/i,
    /\bnew grad(?:uate)?\b/i,
  ],
  intern: [/\bintern(?:ship)?\b/i],
};

/**
 * Detects the seniority of a job posting from title first, then explicit role statements in description.
 * @param posting job posting data
 * @returns detected seniority
 */
function detectSeniority(posting: JobPosting): Seniority {
  const title = posting.title;
  const description = posting.description ?? "";

  const inTitle = detectSeniorityFromText(title);
  if (inTitle !== undefined) return inTitle;

  const inDescription = detectSeniorityFromDescription(description);
  return inDescription ?? "unknown";
}

function detectSeniorityFromText(
  text: string,
): Exclude<Seniority, "unknown"> | undefined {
  for (const level of SENIORITY_PRECEDENCE) {
    const patterns = SENIORITY_KEYWORDS[level];
    if (patterns.some((pattern) => pattern.test(text))) return level;
  }
  return undefined;
}

function detectSeniorityFromDescription(
  description: string,
): Exclude<Seniority, "unknown"> | undefined {
  for (const level of SENIORITY_PRECEDENCE) {
    const patterns = SENIORITY_KEYWORDS[level];
    for (const pattern of patterns) {
      const roleFirst = new RegExp(
        `\\b(?:role|position|title|level)\\b[^\\n]{0,25}${pattern.source}`,
        "i",
      );
      const levelFirst = new RegExp(
        `${pattern.source}[^\\n]{0,25}\\b(?:role|position|title|level)\\b`,
        "i",
      );
      const hiringContext = new RegExp(
        `\\b(?:hiring|seeking|looking\\s+for|looking\\s+to\\s+hire)\\b[^\\n]{0,40}${pattern.source}`,
        "i",
      );

      if (
        roleFirst.test(description) ||
        levelFirst.test(description) ||
        hiringContext.test(description)
      ) {
        return level;
      }
    }
  }

  const inferredFromYears = detectSeniorityFromExperienceYears(description);
  if (inferredFromYears !== undefined) return inferredFromYears;

  return undefined;
}

function detectSeniorityFromExperienceYears(
  description: string,
): "junior" | "mid" | "senior" | undefined {
  const experiencePatterns = [
    String.raw`\b(?:(?:minimum|min\.?|at\s+least)\s+)?(?<min>\d{1,2})(?:\s*(?:\+|plus))?(?:\s*[-–—]\s*(?<max>\d{1,2}))?\s+years?\s+(?:of\s+)?(?:[a-zA-Z][\w-]*\s+){0,3}experience\b`,
    String.raw`\b(?:experience|qualifications?|requirements?)\b[^\n]{0,30}\b(?<min>\d{1,2})(?:\s*(?:\+|plus))?(?:\s*[-–—]\s*(?<max>\d{1,2}))?\s+years?\b`,
  ];

  let highestMinimumYears = -1;

  for (const pattern of experiencePatterns) {
    const regex = new RegExp(pattern, "gi");
    for (const match of description.matchAll(regex)) {
      const minimumYears = parseInt(match.groups?.min ?? "", 10);
      if (Number.isNaN(minimumYears)) continue;
      highestMinimumYears = Math.max(highestMinimumYears, minimumYears);
    }
  }

  if (highestMinimumYears < 0) return undefined;
  return mapExperienceYearsToSeniority(highestMinimumYears);
}

function mapExperienceYearsToSeniority(
  minimumYears: number,
): "junior" | "mid" | "senior" {
  if (minimumYears >= 5) return "senior";
  if (minimumYears >= 2) return "mid";
  return "junior";
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
  if (posting.seniority === undefined || posting.seniority === "unknown") {
    posting.seniority = detectSeniority(posting);
  }

  return posting;
}

export function fillAllPostingDetails(postings: JobPosting[]): JobPosting[] {
  return postings.map(fillPostingDetails);
}
