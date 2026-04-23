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

  test("parses seniority values case-insensitively", () => {
    const config = parseConfig(`
      match:
        includeKeywords: [typescript]
        seniority:
          - level: Junior
          - level: MID
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
    `);

    expect(config.match.seniority).toEqual([
      { level: "junior" },
      { level: "mid" },
    ]);
  });

  test("throws for unsupported seniority values", () => {
    expect(() =>
      parseConfig(`
      match:
        includeKeywords: [typescript]
        seniority:
          - level: expert
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
      `),
    ).toThrow("unsupported seniority");
  });

  test("throws when seniority is not an array of rule objects", () => {
    expect(() =>
      parseConfig(`
      match:
        includeKeywords: [typescript]
        seniority:
          levels: [junior, mid]
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
      `),
    ).toThrow("match.seniority must be an array of objects");
  });

  test("parses configurable seniority bonuses", () => {
    const config = parseConfig(`
      match:
        includeKeywords: [typescript]
        seniority:
          - level: Junior
            bonus: 40
          - level: mid
            bonus: 15
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
    `);

    expect(config.match.seniority).toEqual([
      { level: "junior", bonus: 40 },
      { level: "mid", bonus: 15 },
    ]);
  });

  test("throws when unknown seniority is configured in rules", () => {
    expect(() =>
      parseConfig(`
      match:
        includeKeywords: [typescript]
        seniority:
          - level: unknown
            bonus: 50
      sources:
        - company: acme
          type: greenhouse
          boardToken: acme
          enabled: true
      `),
    ).toThrow('"unknown" cannot be configured');
  });

});
