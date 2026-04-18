import type {
  JobMatch,
  JobPosting,
  QueryConfig,
  SalaryBand,
  WorkMode,
} from "./types";
import cc, { type CurrencyCodeRecord } from "currency-codes";

function mapCountryCode(location: string): CurrencyCodeRecord | undefined {
  const lower = location.toLowerCase();

  for (const country of cc.countries()) {
    if (lower.includes(country)) {
      // probably safe to assume the first currency is the most relevant
      return cc.country(country)[0] as CurrencyCodeRecord;
    }
  }
}

/*
  If the adapter didn't include workMode, we can try to detect it from the job description
*/
function detectWorkMode(posting: JobPosting): WorkMode {
  if (posting.workMode !== "unknown") return posting.workMode;
  const combined = [posting.title, posting.location, posting.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (combined.includes("remote")) return "remote";
  if (combined.includes("hybrid")) return "hybrid";

  // assume the job is on-site in the absence of "remote" or "hybrid"
  return "onsite";
}

/*
  If the adapter didn't find salary info, we can try to detect it from the job description
*/
function detectSalary(posting: JobPosting): SalaryBand[] {
  const combined = [posting.title, posting.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const salaryRegex =
    /(?:salary|compensation|pay|wage|rate)[^\n]{0,60}(?<min>[\d,]+)\s*[-–—]\s*(?<max>[\d,]+)/gi;
  const currencyRegex = /\b(?<currency>USD|CAD|EUR|GBP|AUD|NZD)\b/;

  const matches = [...combined.matchAll(salaryRegex)];
  const ranges = matches.map((match) => ({
    min: parseInt(match.groups?.min?.replace(/,/g, "") ?? "0"),
    max: parseInt(match.groups?.max?.replace(/,/g, "") ?? "0"),
  }));

  // detecting currency is a bit tricky, approach here is to first look for a standard currency code (eg USD, CAD)
  // and if we don't find one, look for a country name anywhere in the job posting and guess currency based on that
  // there's a chance this still misses, some postings only list city and state and assume you know the country
  let currency = cc.code(combined.match(currencyRegex)?.groups?.currency ?? "");
  if (typeof currency === "undefined") {
    const haystack = [
      posting.title,
      posting.company,
      posting.location,
      posting.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const country of cc.countries()) {
      if (haystack?.includes(country)) {
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

function getPreferredCurrencySalary(
  salaryBands: SalaryBand[] | undefined,
  priorityCurrency: CurrencyCodeRecord,
): SalaryBand | undefined {
  // try to find a salary range with the priorityCurrency, if not available, return any
  const validSalaryBands =
    salaryBands?.filter((band) => typeof band.currency !== "undefined") ?? [];
  if (validSalaryBands.length === 0) return undefined;

  const priorityRanges = validSalaryBands.filter(
    (r) => r.currency.code === priorityCurrency.code,
  );

  // we found 1 or more ranges in the target currency, return a combined range for simplicity
  if (priorityRanges.length !== 0) {
    return {
      bottom: Math.min(...priorityRanges.map((x) => x.bottom)),
      top: Math.max(...priorityRanges.map((x) => x.top)),
      currency: priorityCurrency,
    };
  }

  // no preferred currency range, find pay range for first available currency
  const availableCurrency = validSalaryBands[0]?.currency;
  if (typeof availableCurrency === "undefined") return undefined;

  const availableRanges = validSalaryBands.filter(
    (r) => r.currency.code === availableCurrency?.code,
  );

  return {
    bottom: Math.min(...availableRanges.map((x) => x.bottom)),
    top: Math.max(...availableRanges.map((x) => x.top)),
    currency: availableCurrency,
  };
}

export function scorePosting(
  posting: JobPosting,
  query: QueryConfig,
): JobMatch {
  const workMode = detectWorkMode(posting);

  if (
    typeof posting.salaryBands === "undefined" ||
    posting.salaryBands.length === 0
  ) {
    const inferredBands = detectSalary(posting);
    posting.salaryBands = inferredBands;
  }

  const haystack = [
    posting.title,
    posting.company,
    posting.location,
    posting.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const includeKeywords = query.includeKeywords.map((x) => x.toLowerCase());
  const excludeKeywords = (query.excludeKeywords ?? []).map((x) =>
    x.toLowerCase(),
  );
  const matchedKeywords = includeKeywords.filter((keyword) =>
    haystack.includes(keyword),
  );

  for (const excluded of excludeKeywords) {
    if (haystack.includes(excluded)) {
      return {
        posting: { ...posting, workMode },
        score: -100,
        matchedKeywords,
        filtered: true,
        filterReason: `excluded keyword "${excluded}"`,
      };
    }
  }

  if (query.remoteOnly && workMode !== "remote") {
    return {
      posting: { ...posting, workMode },
      score: -100,
      matchedKeywords,
      filtered: true,
      filterReason: "non-remote role",
    };
  }

  if (query.minSalary !== undefined && query.preferredCurrency !== undefined) {
    const salaryBand = getPreferredCurrencySalary(
      posting.salaryBands,
      query.preferredCurrency,
    );

    if (salaryBand !== undefined && salaryBand.top < query.minSalary)
      return {
        posting: { ...posting, workMode },
        score: -100,
        matchedKeywords,
        filtered: true,
        filterReason: `max salary below ${query.minSalary}`,
      };
  }

  const locationBonus =
    query.locations && query.locations.length > 0
      ? query.locations.some((location) =>
          haystack.includes(location.toLowerCase()),
        )
        ? 5
        : 0
      : 0;

  const score = matchedKeywords.length * 10 + locationBonus;
  const filtered = matchedKeywords.length === 0;

  return {
    posting: { ...posting, workMode },
    score,
    matchedKeywords,
    filtered,
    filterReason: filtered ? "no keyword matches" : undefined,
  };
}

export function scorePostings(
  postings: JobPosting[],
  query: QueryConfig,
): JobMatch[] {
  return postings.map((posting) => scorePosting(posting, query));
}

export function rankPostings(scoredPostings: JobMatch[]): JobMatch[] {
  return scoredPostings
    .filter((match) => !match.filtered)
    .sort((a, b) => b.score - a.score);
}
