import { describe, expect, test } from "bun:test";
import { parseConfig } from "../src/features/scan/parse-config";

describe("parseConfig", () => {
  test("parses valid config and assigns source IDs", () => {
    const config = parseConfig(`
      match:
        includeKeywords: [typescript, backend]
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
        - company: example.com
          type: static
          url: https://example.com/jobs
          listingSelector: .job
          titleSelector: .title
          linkSelector: a
          enabled: true
    `);

    expect(config.match.includeKeywords).toEqual(["typescript", "backend"]);
    expect(config.sources).toHaveLength(2);
    expect(config.sources[0]?.id).toBe("greenhouse:acme");
    expect(config.sources[1]?.id).toBe("static:https://example.com/jobs");
  });

  test("throws for unsupported source types", () => {
    expect(() =>
      parseConfig(`
      match:
        includeKeywords: [typescript]
      sources:
        - type: workday
          enabled: true
      `),
    ).toThrow("unsupported source type");
  });

  test("throws when includeKeywords is missing", () => {
    expect(() =>
      parseConfig(`
      match:
        remoteOnly: true
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
      `),
    ).toThrow("query.includeKeywords");
  });
});
