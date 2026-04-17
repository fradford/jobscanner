import { afterEach, describe, expect, mock, test } from "bun:test";
import { ResumeBuilder } from "../src/builders/resume-builder";
import { buildResume, parseResumeContent } from "../src/build-resume";
import type { ResumeData } from "../src/types";

afterEach(() => {
  mock.restore();
});

describe("parseResumeContent", () => {
  test("parses basic resume yaml", () => {
    const parsed = parseResumeContent(`
      name: Jane Doe
      title: Software Engineer
      contacts:
        - display: jane@example.com
          link: mailto:jane@example.com
      experience:
        - company: Acme
          position: Developer
          startDate: 2024-01-01
          endDate: 2024-12-31
          bullets: [Built features]
      coreCompetencies:
        - Communication
        - Troubleshooting
    `);

    expect(parsed.name).toBe("Jane Doe");
    expect(parsed.title).toBe("Software Engineer");
    expect(parsed.contacts).toEqual([
      { display: "jane@example.com", link: "mailto:jane@example.com" },
    ]);
    expect(parsed.coreCompetencies).toEqual([
      "Communication",
      "Troubleshooting",
    ]);
    expect(parsed.experience).toHaveLength(1);
    expect(parsed.experience?.[0]?.startDate).toBeInstanceOf(Date);
  });

  test("throws for invalid experience date values", () => {
    expect(() =>
      parseResumeContent(`
        experience:
          - company: Acme
            position: Developer
            startDate: not-a-date
            endDate: 2024-12-31
            bullets: [Built features]
      `),
    ).toThrow("experience[0].startDate");
  });
});

describe("buildResume", () => {
  test("passes partial contacts as positional args and builds the resume", async () => {
    const addContacts = mock(() => {});
    const runBuild = mock(async () => {});
    ResumeBuilder.prototype.addContacts = addContacts;
    ResumeBuilder.prototype.buildResume = runBuild;

    const resumeData: ResumeData = {
      contacts: [
        { display: "jane@example.com", link: "mailto:jane@example.com" },
        { display: "(555) 111-2222" },
      ],
    };

    await buildResume(
      resumeData,
      {
        outputPath: "output/resume.pdf",
        sections: ["summary"],
      },
    );

    expect(addContacts).toHaveBeenCalledTimes(1);
    expect(addContacts).toHaveBeenCalledWith(
      { display: "jane@example.com", link: "mailto:jane@example.com" },
      { display: "(555) 111-2222" },
      undefined,
      undefined,
      undefined,
    );
    expect(runBuild).toHaveBeenCalledTimes(1);
  });
});
