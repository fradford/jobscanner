import type {
  JobMatch,
  ScanMatchResult,
} from "../features/scan/types";

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function fullDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toStartOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatPostedAt(postedAt: Date, now: Date): string | undefined {
  const postedAtMs = postedAt.getTime();

  if (Number.isNaN(postedAtMs)) {
    return undefined;
  }

  const calendarDaysAgo = Math.floor(
    (toStartOfDayMs(now) - toStartOfDayMs(postedAt)) / DAY_IN_MS,
  );

  if (calendarDaysAgo <= 0) {
    const hoursAgo = Math.max(
      0,
      Math.floor((now.getTime() - postedAtMs) / HOUR_IN_MS),
    );
    const hourUnit = hoursAgo === 1 ? "hour" : "hours";
    return `posted ${hoursAgo} ${hourUnit} ago`;
  }

  if (calendarDaysAgo < 30) {
    const dayUnit = calendarDaysAgo === 1 ? "day" : "days";
    return `posted ${calendarDaysAgo} ${dayUnit} ago`;
  }

  return `posted ${fullDate(postedAt)}`;
}

function lineForMatch(match: JobMatch, index: number, now: Date): string {
  const posting = match.posting;
  const keywords =
    match.matchedKeywords.length > 0
      ? match.matchedKeywords.join(", ")
      : "none";
  const seniority = posting.seniority ?? "unknown";
  const postedAt = posting.postedAt
    ? formatPostedAt(posting.postedAt, now)
    : undefined;
  const postedAtSummary = postedAt ? ` | ${postedAt}` : "";
  const freshnessMarker = posting.isNew ? " [NEW]" : "";
  return `${index + 1}. [Score: ${match.score}]${freshnessMarker} ${posting.title} @ ${posting.company}\n   ${posting.location ?? "Unknown location"} | ${posting.url}\n   matched: ${keywords} | seniority: ${seniority}${postedAtSummary}`;
}

export function formatScanResult(scan: ScanMatchResult, now = new Date()): string {
  const lines: string[] = [];
  const newCount = scan.matches.filter((match) => match.posting.isNew).length;
  lines.push(`Found ${scan.matches.length} matching jobs (${newCount} new).`);
  if (scan.failures.length > 0) {
    lines.push(`Source failures (${scan.failures.length}):`);
    for (const failure of scan.failures) {
      lines.push(`- ${failure.sourceId}: ${failure.message}`);
    }
  }
  if (scan.matches.length > 0) {
    lines.push("");
    scan.matches.forEach((match, index) =>
      lines.push(lineForMatch(match, index, now)),
    );
  }
  return lines.join("\n");
}

export function sanitizeString(str: string) {
  str = str.replace(/[^a-z0-9 \.,_-]/gim, "");
  return str.trim();
}

export function escapeLatex(value: string): string {
  return value.replace(/[\\{}$&#_%~^]/g, (char) => {
    switch (char) {
      case "\\":
        return "\\textbackslash{}";
      case "{":
        return "\\{";
      case "}":
        return "\\}";
      case "$":
        return "\\$";
      case "&":
        return "\\&";
      case "#":
        return "\\#";
      case "_":
        return "\\_";
      case "%":
        return "\\%";
      case "~":
        return "\\textasciitilde{}";
      case "^":
        return "\\textasciicircum{}";
      default:
        return char;
    }
  });
}
