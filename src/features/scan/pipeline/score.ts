import type { CurrencyCodeRecord } from "currency-codes";
import type { JobMatch, JobPosting, MatchConfig, SalaryBand } from "../types";

/**
 * Extracts salary bands matching the preferred currency and returns as a single band.
 * If there are no bands in the preferred currency, returns the first available currency.
 * @param salaryBands a list of extracted salary bands
 * @param priorityCurrency the user's preferred currency
 * @returns single SalaryBand
 */
function getPreferredSalary(
  salaryBands: SalaryBand[],
  priorityCurrency: CurrencyCodeRecord,
): SalaryBand {
  if (salaryBands.length === 0) throw new Error("No salary bands provided!");

  const preferredBands = salaryBands.filter(
    (r) => r.currency.code === priorityCurrency.code,
  );

  if (preferredBands.length !== 0) {
    return {
      bottom: Math.min(...preferredBands.map((x) => x.bottom)),
      top: Math.max(...preferredBands.map((x) => x.top)),
      currency: priorityCurrency,
    };
  }

  // no preferred currency range, find first available instead
  const availableCurrency = salaryBands[0]!.currency;

  const availableRanges = salaryBands.filter(
    (r) => r.currency.code === availableCurrency.code,
  );

  return {
    bottom: Math.min(...availableRanges.map((x) => x.bottom)),
    top: Math.max(...availableRanges.map((x) => x.top)),
    currency: availableCurrency,
  };
}

export function scorePosting(
  posting: JobPosting,
  match: MatchConfig,
): JobMatch {
  const haystack = [
    posting.title,
    posting.company,
    posting.location,
    posting.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const includeKeywords = match.includeKeywords.map((x) => x.toLowerCase());
  const excludeKeywords =
    match.excludeKeywords?.map((x) => x.toLowerCase()) ?? [];
  const matchedKeywords = includeKeywords.filter((key) =>
    haystack.includes(key),
  );

  // hard keyword filter
  for (const key of excludeKeywords) {
    if (haystack.includes(key)) {
      return {
        posting,
        score: -100,
        matchedKeywords,
        filtered: true,
        filterReason: `excluded keyword "${key}"`,
      };
    }
  }

  // hard remote filter
  if (match.remoteOnly && posting.workMode !== "remote") {
    return {
      posting,
      score: -100,
      matchedKeywords,
      filtered: true,
      filterReason: "non-remote role",
    };
  }

  // hard salary filter
  if (match.minSalary !== undefined && match.preferredCurrency !== undefined) {
    if (posting.salaryBands !== undefined && posting.salaryBands.length > 0) {
      const salaryBand = getPreferredSalary(
        posting.salaryBands,
        match.preferredCurrency,
      );

      if (salaryBand.top < match.minSalary) {
        return {
          posting,
          score: -100,
          matchedKeywords,
          filtered: true,
          filterReason: `max salary below ${match.minSalary}`,
        };
      }
    }
  }

  // calculate location bonus
  let locationBonus = 0;
  if (match.locations !== undefined && match.locations.length > 0) {
    if (
      posting.location !== undefined &&
      match.locations.includes(posting.location)
    ) {
      locationBonus = 5;
    }
  }

  const score = matchedKeywords.length * 10 + locationBonus;
  const filtered = matchedKeywords.length === 0;

  return {
    posting,
    score,
    matchedKeywords,
    filtered,
    filterReason: filtered ? "no keyword matches" : undefined,
  };
}

export function scoreAllPostings(
  postings: JobPosting[],
  match: MatchConfig,
): JobMatch[] {
  return postings.map((post) => scorePosting(post, match));
}
