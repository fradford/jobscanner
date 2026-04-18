import latex from "node-latex";
import { file } from "bun";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type {
  Contact,
  EducationRecord,
  ExperienceRecord,
  ProjectRecord,
  ResumeData,
  ResumeSection,
} from "./types";
import { escapeLatex } from "../../util/formatters";

export class ResumeBuilder {
  private data: ResumeData;

  private outputpath: string;
  private templatepath: string;

  private sections: ResumeSection[];

  public constructor(
    output: string,
    sections: ResumeSection[],
    template: string = "templates/resume.tex",
  ) {
    this.data = {};

    this.outputpath = output;
    this.templatepath = template;

    this.sections = sections;
  }

  public addName(name: string) {
    this.data.name = name;
  }

  public addTitle(title: string) {
    this.data.title = title;
  }

  public addAddress(address: string) {
    this.data.address = address;
  }

  public addSummary(summary: string) {
    this.data.summary = summary;
  }

  public addContacts(
    email?: Contact,
    phone?: Contact,
    linkedIn?: Contact,
    github?: Contact,
    portfolio?: Contact,
  ) {
    if (typeof this.data.contacts === "undefined") this.data.contacts = [];
    if (typeof email !== "undefined") {
      this.data.contacts.push(email);
    }
    if (typeof phone !== "undefined") {
      this.data.contacts.push(phone);
    }
    if (typeof linkedIn !== "undefined") {
      this.data.contacts.push(linkedIn);
    }
    if (typeof github !== "undefined") {
      this.data.contacts.push(github);
    }
    if (typeof portfolio !== "undefined") {
      this.data.contacts.push(portfolio);
    }
  }

  public addEducation(education: EducationRecord) {
    if (typeof this.data.education === "undefined") this.data.education = [];
    this.data.education.push(education);
  }

  public addExperience(experience: ExperienceRecord) {
    if (typeof this.data.experience === "undefined") this.data.experience = [];
    this.data.experience.push(experience);
  }

  public addProject(project: ProjectRecord) {
    if (typeof this.data.projects === "undefined") this.data.projects = [];
    this.data.projects.push(project);
  }

  public addSkills(...skills: string[]) {
    if (typeof this.data.skills === "undefined") this.data.skills = [];
    this.data.skills = this.data.skills.concat(skills);
  }

  public addCoreCompetencies(...competencies: string[]) {
    if (typeof this.data.coreCompetencies === "undefined")
      this.data.coreCompetencies = [];
    this.data.coreCompetencies =
      this.data.coreCompetencies.concat(competencies);
  }

  public async buildResume() {
    // load the template file for preamble and formatting macros
    const template = file(this.templatepath);
    let buffer = await template.text();

    buffer += "\\begin{document}\n\\pagenumbering{gobble}\n";

    buffer = this.buildHeader(buffer);

    // use the sections list as a plan to generate selected sections
    for (const section of this.sections) {
      switch (section) {
        case "summary":
          buffer = this.buildSummary(buffer);
          break;
        case "coreCompetencies":
          buffer = this.buildCoreCompetencies(buffer);
          break;
        case "education":
          buffer = this.buildEducation(buffer);
          break;
        case "experience":
          buffer = this.buildExperience(buffer);
          break;
        case "projects":
          buffer = this.buildProjects(buffer);
          break;
        case "skills":
          buffer = this.buildSkills(buffer);
          break;
      }
    }

    buffer += "\\end{document}";

    // build document
    const pdf = latex(buffer);
    const output = createWriteStream(this.outputpath);
    await pipeline(pdf, output);
  }

  // TODO: Should log failures for these functions probably
  private buildHeader(buffer: string): string {
    // can't build this section with no data
    if (typeof this.data.contacts === "undefined") return buffer;

    // build Header
    const headerCommand = `\\Header{${escapeLatex(this.data.name ?? "")}}{${escapeLatex(this.data.title ?? "")}}{${escapeLatex(this.data.address ?? "")}}`;

    let contactCommand = `\\ContactLine`;
    for (const contact of this.data.contacts) {
      contactCommand += `{\\href{${contact.link ?? ""}}{${escapeLatex(contact.display)}}}`;
    }

    buffer += headerCommand + "\n";
    buffer += contactCommand + "\n";
    return buffer;
  }

  private buildSummary(buffer: string): string {
    // build professional summary
    buffer += "\n\\section*{Summary}\n";
    buffer += escapeLatex(this.data.summary ?? "") + "\n";
    return buffer;
  }

  private buildCoreCompetencies(buffer: string): string {
    // can't build this section with no data
    if (typeof this.data.coreCompetencies === "undefined") return buffer;

    // build core competecies section
    buffer += "\n\\section*{Core Competencies}\n";

    buffer +=
      "\\begin{tabularx}{\\textwidth}{>{\\centering\\arraybackslash}X >{\\centering\\arraybackslash}X >{\\centering\\arraybackslash}X}";

    for (let i = 0; i < this.data.coreCompetencies.length; i += 3) {
      const c1 = escapeLatex(this.data.coreCompetencies[i] ?? "");
      const c2 = escapeLatex(this.data.coreCompetencies[i + 1] ?? "");
      const c3 = escapeLatex(this.data.coreCompetencies[i + 2] ?? "");
      buffer += `${c1} & ${c2} & ${c3} \\\\\n`;
    }

    buffer += "\\end{tabularx}\n";
    return buffer;
  }

  private buildEducation(buffer: string): string {
    // can't build this section with no data
    if (typeof this.data.education === "undefined") return buffer;

    // build education section
    buffer += "\n\\section*{Education}\n";

    for (const education of this.data.education) {
      buffer += `\\Education{${escapeLatex(education.degree)}}{${escapeLatex(education.school)}}{${education.graduationYear}}\n\n`;
    }
    return buffer;
  }

  private buildExperience(buffer: string): string {
    function getDateRange(job: ExperienceRecord): string {
      return `${job.startDate.toLocaleString("default", { month: "long", year: "numeric" })}--${job.endDate.toLocaleString("default", { month: "long", year: "numeric" })}`;
    }

    const getItemizedBullets = (job: ExperienceRecord): string => {
      return job.bullets
        .map((bullet) => `\\item ${escapeLatex(bullet)}`)
        .join("\n")
        .trim();
    };

    // can't build this section with no data
    if (typeof this.data.experience === "undefined") return buffer;

    // build experience section
    buffer += "\n\\section*{Work Experience}\n";

    for (const job of this.data.experience) {
      buffer += `\\Experience{${escapeLatex(job.position)}}{${escapeLatex(job.company)}}{${escapeLatex(job.companyBlurb ?? "")}}{${escapeLatex(getDateRange(job))}}{${getItemizedBullets(job)}}\n\n`;
    }
    return buffer;
  }

  private buildProjects(buffer: string): string {
    // can't build this section with no data
    if (typeof this.data.projects === "undefined") return buffer;

    // build projects section
    buffer += "\n\\section*{Projects}\n";

    for (const project of this.data.projects) {
      buffer += `\\Project{${escapeLatex(project.name)}}{${escapeLatex(project.link ?? "")}}{${escapeLatex(project.description)}}\n\n`;
    }
    return buffer;
  }

  private buildSkills(buffer: string): string {
    // can't build this section with no data
    if (typeof this.data.skills === "undefined") return buffer;

    // build skills section
    buffer += "\n\\section*{Skills}\n";

    buffer += escapeLatex(this.data.skills.join(", ").trim());
    buffer += "\n";
    return buffer;
  }
}
