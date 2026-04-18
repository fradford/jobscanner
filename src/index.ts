import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig } from "./features/scan/parse-config";
import { runScan } from "./features/scan/scan";
import { formatScanResult } from "./util/formatters";
import {
  loadPostingIds,
  recordFailures,
  recordMatches,
  recordPostings,
} from "./util/logging";
import { AllSourcesFailedError } from "./features/scan/types";
import { buildResume, loadResume } from "./features/resume/build-resume";
import { type ResumeSection } from "./features/resume/types";

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
        const result = await runScan(config, { seenPostings });
        recordMatches(result.matches, argv.logpath);
        recordPostings(result.scoredPostings, argv.logpath);
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
    "create <output>",
    "Creates a customised resume for a matched job",
    (command) =>
      command
        .positional("output", {
          type: "string",
          describe: "Output file path, e.g. 'output/example.pdf'",
        })
        .option("template", {
          type: "string",
          default: "templates/resume.tex",
          describe:
            "Path to resume tex template, must define macros as in default file",
        })
        .option("resume", {
          type: "string",
          default: "config/resume-data.yaml",
          describe: "Path to structured resume content file (yaml|yml)",
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
      if (typeof argv.output === "undefined")
        throw new Error("Missing positional arument 'output'");

      const resumeData = await loadResume(argv.resume);
      await buildResume(resumeData, {
        outputPath: argv.output,
        sections: argv.sections as ResumeSection[],
        templatePath: argv.template,
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
