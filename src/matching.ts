import type {
  Currency,
  JobMatch,
  JobPosting,
  QueryConfig,
  SalaryBand,
  WorkMode,
} from "./types";

const LOCATION_CURRENCY_MAP: Record<string, Currency> = {
  // Countries
  "united states": "USD",
  usa: "USD",
  us: "USD",
  canada: "CAD",
  "united kingdom": "GBP",
  uk: "GBP",
  australia: "AUD",
  "new zealand": "NZD",
  "european union": "EUR",
  eu: "EUR",

  // Cities
  "san francisco": "USD",
  "new york city": "USD",
  nyc: "USD",
  london: "GBP",
  toronto: "CAD",
  vancouver: "CAD",
  sydney: "AUD",
  melbourne: "AUD",
};

function mapCountryCode(location: string): Currency {
  const lower = location.toLowerCase();

  for (const key of Object.keys(LOCATION_CURRENCY_MAP)) {
    if (lower.includes(key)) {
      return LOCATION_CURRENCY_MAP[key] as Currency;
    }
  }

  return "unknown";
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
function detectSalary(posting: JobPosting): SalaryBand | undefined {
  const combined = [posting.title, posting.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const salaryRegex = /\$(?<min>[\d,]+)\s*[-–—]\s*\$(?<max>[\d,]+)/;
  const currencyRegex = /\b(?<currency>USD|CAD|EUR|GBP|AUD|NZD)\b/;

  const salaryMatch = combined.match(salaryRegex);

  const minSalary = parseInt(
    salaryMatch?.groups?.min ? salaryMatch.groups.min.replace(/,/g, "") : "0",
  );
  const maxSalary = parseInt(
    salaryMatch?.groups?.max ? salaryMatch.groups.max.replace(/,/g, "") : "0",
  );

  let currency = (combined.match(currencyRegex)?.groups?.currency ??
    "unknown") as Currency;
  if (currency === "unknown") {
    currency = mapCountryCode(posting.location ?? "");
  }

  // if we found some salary data, return a SalaryBand
  if (minSalary !== 0 && maxSalary !== 0) {
    return {
      bottom: minSalary,
      top: maxSalary,
      currency,
    };
  }

  return undefined;
}

function getPreferredCurrencySalary(
  salaryBands: SalaryBand[] | undefined,
  priorityCurrency: Currency,
): SalaryBand | undefined {
  // try to find a salary range with the priority_currency, if not available, return any Currency
  if (typeof salaryBands === "undefined" || salaryBands.length === 0)
    return undefined;

  const priorityRanges = salaryBands.filter(
    (r) => r.currency === priorityCurrency,
  );
  if (priorityRanges.length !== 0) {
    return {
      bottom: Math.min(...priorityRanges.map((x) => x.bottom)),
      top: Math.max(...priorityRanges.map((x) => x.top)),
      currency: priorityCurrency,
    };
  }

  // find pay range for first available currency
  const available_currency = salaryBands[0]?.currency;
  const availableRanges = salaryBands.filter(
    (r) => r.currency === available_currency,
  );

  return {
    bottom: Math.min(...availableRanges.map((x) => x.bottom)),
    top: Math.max(...availableRanges.map((x) => x.top)),
    currency: available_currency ?? "unknown",
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
    const inferredBand = detectSalary(posting);
    posting.salaryBands = inferredBand ? [inferredBand] : undefined;
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

export function rankPostings(
  postings: JobPosting[],
  query: QueryConfig,
): JobMatch[] {
  return postings
    .map((posting) => scorePosting(posting, query))
    .filter((match) => !match.filtered)
    .sort((a, b) => b.score - a.score);
}
