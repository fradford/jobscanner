import type { CurrencyCodeRecord } from "currency-codes";

// Basic filters
export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export interface QueryConfig {
  includeKeywords: string[];
  excludeKeywords?: string[];
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
  query: QueryConfig;
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
  scoredPostings: JobMatch[];
  matches: JobMatch[];
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

export type ResumeSection =
  | "summary"
  | "coreCompetencies"
  | "experience"
  | "education"
  | "projects"
  | "skills";

export interface EducationRecord {
  school: string;
  degree: string;
  graduationYear: number;
  gpa?: number;
}

export interface ExperienceRecord {
  company: string;
  companyBlurb?: string;
  position: string;
  startDate: Date;
  endDate: Date;
  bullets: string[];
}

export interface ProjectRecord {
  name: string;
  description: string;
  link?: string;
}

export interface Contact {
  display: string;
  link?: string;
}

export interface ResumeData {
  name?: string | undefined;
  title?: string | undefined;
  address?: string | undefined;
  summary?: string | undefined;
  contacts?: Contact[];
  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  skills?: string[];
  coreCompetencies?: string[];
  projects?: ProjectRecord[];
}
