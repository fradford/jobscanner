import type { CurrencyCodeRecord } from "currency-codes";

// Basic filters
export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";
export type Seniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "lead"
  | "manager"
  | "director"
  | "executive"
  | "unknown";
export interface SeniorityRule {
  level: Exclude<Seniority, "unknown">;
  bonus?: number;
}

export interface MatchConfig {
  includeKeywords: string[];
  excludeKeywords?: string[];
  seniority?: SeniorityRule[];
  locations?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
  preferredCurrency?: CurrencyCodeRecord;
}

// Job listing sources
interface BaseSourceConfig {
  id?: string;
  company: string;
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
  match: MatchConfig;
  sources: JobSourceConfig[];
  request?: RequestConfig;
  output?: OutputConfig;
}

export interface SalaryBand {
  bottom: number;
  top: number;
  currency: CurrencyCodeRecord;
}

// Describes job posting details
// scanning pipeline produces list of these
export interface JobPosting {
  id: string;
  sourceId?: string;
  sourceType: JobSourceConfig["type"];
  externalId: string;
  title: string;
  company: string;
  location?: string;
  workMode: WorkMode;
  seniority?: Seniority;
  salaryBands?: SalaryBand[];
  url: string;
  description?: string;
  postedAt?: string;
  isNew?: boolean;
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
  timestamp: Date;
  trace?: string;
}

export interface ScanResult {
  postings: JobPosting[];
  failures: SourceFailure[];
}

export interface ScanMatchResult {
  matches: JobMatch[];
  allPostings: JobMatch[];
  failures: SourceFailure[];
}

export interface AllSourcesFailedError extends Error {
  failures: SourceFailure[];
}

export class AllSourcesFailedError extends Error {
  constructor(message?: string, failures?: SourceFailure[]) {
    // 'Error' breaks prototype chain here
    super(message);

    // restore prototype chain
    const actualProto = new.target.prototype;

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }

    this.name = "AllSourcesFailedError";
    this.failures = failures ?? [];
  }
}
