import type { JobMatch, JobPosting, QueryConfig, WorkMode } from "./types";

function detectWorkMode(posting: JobPosting): WorkMode {
  if (posting.workMode !== "unknown") return posting.workMode;
  const combined = [posting.title, posting.location, posting.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (combined.includes("remote")) return "remote";
  if (combined.includes("hybrid")) return "hybrid";
  if (combined.includes("on-site") || combined.includes("onsite"))
    return "onsite";
  return "unknown";
}

function normalizeWords(input: string): string {
  return input.toLowerCase();
}

export function scorePosting(
  posting: JobPosting,
  query: QueryConfig,
): JobMatch {
  const workMode = detectWorkMode(posting);
  const haystack = normalizeWords(
    [posting.title, posting.company, posting.location, posting.description]
      .filter(Boolean)
      .join(" "),
  );

  const includeKeywords = query.includeKeywords.map(normalizeWords);
  const excludeKeywords = (query.excludeKeywords ?? []).map(normalizeWords);
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

  if (
    query.minSalary !== undefined &&
    posting.salaryRangeMax !== undefined &&
    posting.salaryRangeMax < query.minSalary
  ) {
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
        ? 3
        : 0
      : 0;

  const score = matchedKeywords.length * 10 + locationBonus;
  const filtered = matchedKeywords.length === 0;

  return {
    posting: { ...posting, workMode },
    score,
    matchedKeywords,
    filtered,
    filterReason: filtered ? "no include keyword matched" : undefined,
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
