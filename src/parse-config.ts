import { file } from "bun";
import { parse as parseYaml } from "yaml";
import type {
  JobScannerConfig,
  JobSourceConfig,
  OutputConfig,
  QueryConfig,
  RequestConfig,
} from "./types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid config: "${field}" must be a non-empty string.`);
  }
  return value.trim();
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid config: "${field}" must be a boolean.`);
  }
  return value;
}

function asOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return asString(value, field);
}

function asOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Invalid config: "${field}" must be a boolean.`);
  }
  return value;
}

function asOptionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid config: "${field}" must be a number.`);
  }
  return value;
}

function asStringArray(
  value: unknown,
  field: string,
  required = false,
): string[] {
  if (value === undefined) {
    if (required) throw new Error(`Invalid config: "${field}" is required.`);
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid config: "${field}" must be an array of strings.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function parseQuery(value: unknown): QueryConfig {
  if (!isRecord(value))
    throw new Error("Invalid config: invalid query object.");

  const includeKeywords = asStringArray(
    value.includeKeywords,
    "query.includeKeywords",
    true,
  );
  if (includeKeywords.length === 0)
    throw new Error(
      'Invalid config: "query.includeKeywords" must contain at least one keyword.',
    );

  const excludeKeywords = asStringArray(
    value.excludeKeywords,
    "query.excludeKeywords",
  );
  const locations = asStringArray(value.locations, "query.locations");
  const remoteOnly = asOptionalBoolean(value.remoteOnly, "query.remoteOnly");
  const minSalary = asOptionalNumber(value.minSalary, "query.minSalary");

  return {
    includeKeywords,
    excludeKeywords: excludeKeywords.length > 0 ? excludeKeywords : undefined,
    locations: locations.length > 0 ? locations : undefined,
    remoteOnly,
    minSalary,
  };
}

function parseRequest(value: unknown): RequestConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid config: invalid request object.");

  return {
    timeoutMs: asOptionalNumber(value.timeoutMs, "request.timeoutMs"),
    throttleMs: asOptionalNumber(value.throttleMs, "request.throttleMs"),
    userAgent: asOptionalString(value.userAgent, "request.userAgent"),
    maxPages: asOptionalNumber(value.maxPages, "request.maxPages"),
  };
}

function parseOutput(value: unknown): OutputConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid config: invalid output object.");

  return {
    maxResults: asOptionalNumber(value.maxResults, "output.maxResults"),
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

  const sourceType = asString(value.type, `sources[${index}].type`);
  if (!SOURCE_TYPES.has(sourceType))
    throw new Error(
      `Invalid config: unsupported source type "${sourceType} at sources[${index}].type.`,
    );

  const base = {
    id: asOptionalString(value.id, `sources[${index}].id`),
    enabled: asBoolean(value.enabled, `sources[${index}].enabled`),
  };

  switch (sourceType) {
    case "greenhouse":
      return withSourceId({
        ...base,
        type: "greenhouse",
        boardToken: asString(value.boardToken, `sources[${index}].boardToken`),
      });
    default:
      return withSourceId({
        ...base,
        type: "static",
        url: asString(value.url, `sources[${index}].url`),
        listingSelector: asString(
          value.listingSelector,
          `sources[${index}].listingSelector`,
        ),
        titleSelector: asString(
          value.titleSelector,
          `sources[${index}].titleSelector`,
        ),
        company: asOptionalString(value.company, `sources[${index}].company`),
        locationSelector: asOptionalString(
          value.locationSelector,
          `sources[${index}].locationSelector`,
        ),
        descriptionSelector: asOptionalString(
          value.descriptionSelector,
          `sources[${index}].descriptionSelector`,
        ),
        linkSelector: asString(
          value.linkSelector,
          `sources[${index}].linkSelector`,
        ),
      });
  }
}
