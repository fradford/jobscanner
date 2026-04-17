import { file } from "bun";
import { ResumeBuilder } from "./builders/resume-builder";
import yaml from "yaml";
import {
  asNumber,
  asOptionalString,
  asString,
  asStringArray,
  isRecord,
} from "./util/type-utils";
import type {
  EducationRecord,
  ExperienceRecord,
  ProjectRecord,
  ResumeData,
  ResumeSection,
  Contact,
} from "./types";

// loads resume config from a file
export async function loadResume(resumePath: string): Promise<ResumeData> {
  const fileContent = await file(resumePath).text();
  return parseResumeContent(fileContent);
}

// parses string representation of resume config into a valid ResumeData object
export function parseResumeContent(content: string): ResumeData {
  const parsed = yaml.parse(content);

  if (!isRecord(parsed))
    throw new Error("Invalid resume: root value must be an object.");

  const education = parsed.education;
  const experience = parsed.experience;
  const projects = parsed.projects;

  return {
    name: asOptionalString(parsed.name),
    title: asOptionalString(parsed.title),
    address: asOptionalString(parsed.address),
    summary: asOptionalString(parsed.summary),
    contacts: parseContacts(parsed.contacts),
    education: parseEducation(education),
    experience: parseExperience(experience),
    skills: parseStringArray(parsed.skills),
    coreCompetencies: parseStringArray(parsed.coreCompetencies),
    projects: parseProjects(projects),
  };
}

export interface ResumeBuilderOptions {
  outputPath: string;
  sections: ResumeSection[];
  templatePath?: string;
}

// creates a ResumeBuilder and builds the resume using provided data
export async function buildResume(
  resumeData: ResumeData,
  options: ResumeBuilderOptions,
): Promise<void> {
  const builder = new ResumeBuilder(
    options.outputPath,
    options.sections,
    options.templatePath,
  );

  if (typeof resumeData.name !== "undefined") builder.addName(resumeData.name);
  if (typeof resumeData.title !== "undefined")
    builder.addTitle(resumeData.title);
  if (typeof resumeData.address !== "undefined")
    builder.addAddress(resumeData.address);
  if (typeof resumeData.summary !== "undefined")
    builder.addSummary(resumeData.summary);

  if (Array.isArray(resumeData.contacts)) {
    builder.addContacts(
      resumeData.contacts[0],
      resumeData.contacts[1],
      resumeData.contacts[2],
      resumeData.contacts[3],
      resumeData.contacts[4],
    );
  }

  for (const education of resumeData.education ?? []) {
    builder.addEducation(education);
  }

  for (const experience of resumeData.experience ?? []) {
    builder.addExperience(experience);
  }

  for (const project of resumeData.projects ?? []) {
    builder.addProject(project);
  }

  if (Array.isArray(resumeData.skills)) {
    builder.addSkills(...resumeData.skills);
  }

  if (Array.isArray(resumeData.coreCompetencies)) {
    builder.addCoreCompetencies(...resumeData.coreCompetencies);
  }

  await builder.buildResume();
}

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return asStringArray(value);
}

function parseContacts(value: unknown): Contact[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value))
    throw new Error("Invalid resume: contact list must be an array.");

  return value.map((item, index) => {
    if (!isRecord(item))
      throw new Error(`Invalid resume: contacts[${index}] must be an object.`);

    return {
      display: asString(item.display),
      link: asOptionalString(item.link),
    };
  });
}

function parseEducation(value: unknown): EducationRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value))
    throw new Error("Invalid resume: education must be an array.");

  return value.map((item, index) => {
    if (!isRecord(item))
      throw new Error(`Invalid resume: education[${index}] must be an object.`);

    return {
      school: asString(item.school),
      degree: asString(item.degree),
      graduationYear: asNumber(item.graduationYear),
      gpa: item.gpa === undefined ? undefined : asNumber(item.gpa),
    };
  });
}

function parseExperience(value: unknown): ExperienceRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value))
    throw new Error("Invalid resume: experience must be an array.");

  return value.map((item, index) => {
    if (!isRecord(item))
      throw new Error(
        `Invalid resume: experience[${index}] must be an object.`,
      );

    return {
      company: asString(item.company),
      companyBlurb: asOptionalString(item.companyBlurb),
      position: asString(item.position),
      startDate: parseDate(item.startDate, `experience[${index}].startDate`),
      endDate: parseDate(item.endDate, `experience[${index}].endDate`),
      bullets: asStringArray(item.bullets),
    };
  });
}

function parseProjects(value: unknown): ProjectRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value))
    throw new Error("Invalid resume: projects must be an array.");

  return value.map((item, index) => {
    if (!isRecord(item))
      throw new Error(`Invalid resume: projects[${index}] must be an object.`);

    return {
      name: asString(item.name),
      description: asString(item.description),
      link: asOptionalString(item.link),
    };
  });
}

function parseDate(value: unknown, path: string): Date {
  const dateString = asString(value);
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid resume: ${path} must be a valid date string.`);
  }
  return parsedDate;
}
