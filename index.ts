import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig } from "./features/scan/parse-config";
import { formatScanResult } from "./lib/formatters";
import {
  loadPostingIds,
  recordFailures,
  recordMatches,
  recordPostings,
} from "./lib/logging";
import { AllSourcesFailedError } from "./features/scan/types";
import { buildResume, loadResume } from "./features/resume/build-resume";
import { type ResumeSection } from "./features/resume/types";
import {
  buildCoverLetter,
  loadCoverLetter,
} from "./features/coverletter/build-cover-letter";
import { runScanPipeline } from "./features/scan";

yargs(hideBin(process.argv))
  .scriptName("jobscanner")
  .usage("$0 <cmd> [args]")
  .command(
    "scan",
    "Run job search pipeline",
    (command) =>
      command
        .option("config", {
          type: "string",
          default: "config/scan.yaml",
          describe: "Path to config file (yaml|yml)",
        })
        .option("logpath", {
          type: "string",
          default: "logs",
          describe: "Path to logs directory",
        }),
    async (argv) => {
      const config = await loadConfig(argv.config);

      try {
        const seenPostings = await loadPostingIds(argv.logpath);
        const result = await runScanPipeline(config, seenPostings);
        recordMatches(result.matches, argv.logpath);
        recordPostings(result.allPostings, argv.logpath);
        recordFailures(result.failures, argv.logpath);

        console.log(formatScanResult(result));
      } catch (error) {
        if (error instanceof AllSourcesFailedError) {
          recordFailures(error.failures, argv.logpath);
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exitCode = 1;
      }
    },
  )
  .command(
    "validate",
    "Validates the scan settings file and prints detected sources",
    (command) =>
      command.option("config", {
        type: "string",
        default: "config/scan.yaml",
        describe: "Path to config file (yaml|yml)",
      }),
    async (argv) => {
      const config = await loadConfig(argv.config);
      const sourceSummary = config.sources
        .map(
          (source) =>
            `- ${source.id} (${source.type})${source.enabled === false ? " [disabled]" : ""}`,
        )
        .join("\n");
      console.log(`Valid config (${argv.config})`);
      console.log(`Sources (${config.sources.length}):\n${sourceSummary}`);
    },
  )
  .command(
    "resume <data> <output>",
    "Creates a resume",
    (command) =>
      command
        .positional("data", {
          type: "string",
          describe: "Input file path, structured resume content (yaml|yml)",
        })
        .positional("output", {
          type: "string",
          describe: "Output file path, e.g. 'output/resume.pdf'",
        })
        .option("template", {
          type: "string",
          default: "templates/resume.tex",
          describe:
            "Path to resume tex template, must define macros as in default file",
        })
        .option("sections", {
          type: "array",
          default: [
            "summary",
            "coreCompetencies",
            "experience",
            "education",
            "projects",
            "skills",
          ],
          describe: "Customise the included sections (and their order).",
        }),
    async (argv) => {
      if (argv.data === undefined || argv.output === undefined)
        throw new Error("Missing positional arument!");

      const resumeData = await loadResume(argv.data);
      await buildResume(resumeData, {
        outputPath: argv.output,
        sections: argv.sections as ResumeSection[],
        templatePath: argv.template,
      });
    },
  )
  .command(
    "letter <data> <output>",
    "Creates a cover letter",
    (command) =>
      command
        .positional("data", {
          type: "string",
          describe:
            "Input file path, structured cover letter content (yaml|yml)",
        })
        .positional("output", {
          type: "string",
          describe: "Output file path, e.g 'output/letter.pdf'",
        })
        .option("template", {
          type: "string",
          default: "templates/cover-letter.tex",
          describe: "Path to cover letter tex template",
        })
        .option("signature", {
          type: "string",
          default: "~/signature.png",
          describe: "Path to signature image file",
        }),
    async (argv) => {
      if (argv.data === undefined || argv.output === undefined)
        throw new Error("Missing positional argument!");

      const letterData = await loadCoverLetter(argv.data);
      await buildCoverLetter(letterData, {
        outputPath: argv.output,
        templatePath: argv.template,
        signaturePath: argv.signature,
      });
    },
  )
  .demandCommand(1, "Provide a command!")
  .help()
  .strict()
  .parseAsync()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
