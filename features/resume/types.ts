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

export interface ResumeBuilderOptions {
  outputPath: string;
  sections: ResumeSection[];
  templatePath?: string;
}
