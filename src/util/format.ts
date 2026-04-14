import type { JobMatch, ScanResult } from "../types";

function lineForMatch(match: JobMatch, index: number): string {
  const posting = match.posting;
  const keywords =
    match.matchedKeywords.length > 0
      ? match.matchedKeywords.join(", ")
      : "none";
  return `${index + 1}. [${match.score}] ${posting.title} @ ${posting.company}\n   ${posting.location ?? "Unknown location"} | ${posting.url}\n   matched: ${keywords}`;
}

export function formatScanResult(scan: ScanResult): string {
  const lines: string[] = [];
  lines.push(`Found ${scan.matches.length} matching jobs.`);
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
