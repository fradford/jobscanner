import type { JobMatch, ScanResult } from "../features/scan/types";

function lineForMatch(match: JobMatch, index: number): string {
  const posting = match.posting;
  const keywords =
    match.matchedKeywords.length > 0
      ? match.matchedKeywords.join(", ")
      : "none";
  const freshnessMarker = posting.isNew ? " [NEW]" : "";
  return `${index + 1}. [Score: ${match.score}]${freshnessMarker} ${posting.title} @ ${posting.company}\n   ${posting.location ?? "Unknown location"} | ${posting.url}\n   matched: ${keywords}`;
}

export function formatScanResult(scan: ScanResult): string {
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
      lines.push(lineForMatch(match, index)),
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
