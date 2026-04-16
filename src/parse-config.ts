import { file } from "bun";
import { parse as parseYaml } from "yaml";
import type {
  JobScannerConfig,
  JobSourceConfig,
  OutputConfig,
  QueryConfig,
  RequestConfig,
} from "./types";
import {
  asBoolean,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asString,
  asStringArray,
  isRecord,
} from "./util/type-utils";
import cc, { type CurrencyCodeRecord } from "currency-codes";

const SOURCE_TYPES = new Set(["greenhouse", "static"]);

export async function loadConfig(
  configPath: string,
): Promise<JobScannerConfig> {
  const fileContent = await file(configPath).text();
  return parseConfig(fileContent);
}

export function parseConfig(configString: string): JobScannerConfig {
  const parsed = parseYaml(configString);

  if (!isRecord(parsed))
    throw new Error("Invalid config: root value must be an object.");
  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0)
    throw new Error("Invalid config: no sources defined");

  return {
    query: parseQuery(parsed.query),
    sources: parsed.sources.map((source, index) => parseSource(source, index)),
    request: parseRequest(parsed.request),
    output: parseOutput(parsed.output),
  };
}

function parseQuery(value: unknown): QueryConfig {
  if (!isRecord(value))
    throw new Error("Invalid config: invalid query object.");

  const includeKeywords = asStringArray(value.includeKeywords);
  if (includeKeywords.length === 0)
    throw new Error(
      'Invalid config: "query.includeKeywords" must contain at least one keyword.',
    );

  const excludeKeywords = asStringArray(value.excludeKeywords);
  const locations = asStringArray(value.locations);
  const remoteOnly = asOptionalBoolean(value.remoteOnly);
  const minSalary = asOptionalNumber(value.minSalary);
  const preferredCurrency = cc.code(asString(value.preferredCurrency));

  return {
    includeKeywords,
    excludeKeywords: excludeKeywords.length > 0 ? excludeKeywords : undefined,
    locations: locations.length > 0 ? locations : undefined,
    remoteOnly,
    minSalary,
    preferredCurrency,
  };
}

function parseRequest(value: unknown): RequestConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid config: invalid request object.");

  return {
    timeoutMs: asOptionalNumber(value.timeoutMs),
    throttleMs: asOptionalNumber(value.throttleMs),
    userAgent: asOptionalString(value.userAgent),
    maxPages: asOptionalNumber(value.maxPages),
  };
}

function parseOutput(value: unknown): OutputConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid config: invalid output object.");

  return {
    maxResults: asOptionalNumber(value.maxResults),
  };
}

function withSourceId(source: JobSourceConfig): JobSourceConfig {
  // adds a sourceId to the record when it has not been explicitly specified in the config file
  if (source.id) return source;

  switch (source.type) {
    case "greenhouse":
      return {
        ...source,
        id: `greenhouse:${source.boardToken}`,
      };
    default:
      return {
        ...source,
        id: `static:${source.url}`,
      };
  }
}

function parseSource(value: unknown, index: number): JobSourceConfig {
  if (!isRecord(value))
    throw new Error(`Invalid config: sources[${index}] is invalid.`);

  const sourceType = asString(value.type);
  if (!SOURCE_TYPES.has(sourceType))
    throw new Error(
      `Invalid config: unsupported source type "${sourceType} at sources[${index}].type.`,
    );

  const base = {
    id: asOptionalString(value.id),
    company: asString(value.company),
    enabled: asBoolean(value.enabled),
  };

  switch (sourceType) {
    case "greenhouse":
      return withSourceId({
        ...base,
        type: "greenhouse",
        boardToken: asString(value.boardToken),
      });
    default:
      return withSourceId({
        ...base,
        type: "static",
        url: asString(value.url),
        listingSelector: asString(value.listingSelector),
        titleSelector: asString(value.titleSelector),
        locationSelector: asOptionalString(value.locationSelector),
        descriptionSelector: asOptionalString(value.descriptionSelector),
        linkSelector: asString(value.linkSelector),
      });
  }
}
