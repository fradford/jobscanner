// Basic filters
export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export interface QueryConfig {
  includeKeywords: string[];
  excludeKeywords?: string[];
  locations?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
}

// Job listing sources
interface BaseSourceConfig {
  id?: string;
  enabled: boolean;
}

export interface GreenhouseSourceConfig extends BaseSourceConfig {
  type: "greenhouse";
  boardToken: string;
}

export interface StaticSourceConfig extends BaseSourceConfig {
  type: "static";
  url: string;
  listingSelector: string;
  titleSelector: string;
  linkSelector: string;
  company?: string;
  locationSelector?: string;
  descriptionSelector?: string;
}

export type JobSourceConfig = StaticSourceConfig | GreenhouseSourceConfig;

// Request courtesy configuration values
export interface RequestConfig {
  timeoutMs?: number;
  throttleMs?: number;
  userAgent?: string;
  maxPages?: number;
}

// Output config
export interface OutputConfig {
  maxResults?: number;
}

// Consolidated search config
export interface JobScannerConfig {
  query: QueryConfig;
  sources: JobSourceConfig[];
  request?: RequestConfig;
  output?: OutputConfig;
}

// Describes job posting details
// scanning pipeline produces list of these
export interface JobPosting {
  sourceId?: string;
  sourceType: JobSourceConfig["type"];
  externalId: string;
  title: string;
  company: string;
  location?: string;
  workMode: WorkMode;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  url: string;
  description?: string;
  postedAt?: string;
}

// Describes relevance of job match
// Filter/match pipeline produces list of these
export interface JobMatch {
  posting: JobPosting;
  score: number;
  matchedKeywords: string[];
  filtered: boolean;
  filterReason?: string;
}

// Reporting
export interface SourceFailure {
  sourceId?: string;
  message: string;
}

export interface ScanResult {
  matches: JobMatch[];
  failures: SourceFailure[];
}
