import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig } from "./parse-config";
import { runScan } from "./scan";
import { formatScanResult } from "./util/format";

yargs(hideBin(process.argv))
  .scriptName("jobscanner")
  .usage("$0 <cmd> [args]")
  .command(
    "validate",
    "Validates a config file and prints all resolved sources",
    (command) =>
      command.option("config", {
        type: "string",
        default: "config.yaml",
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
    "scan",
    "Run job search pipeline",
    (command) =>
      command.option("config", {
        type: "string",
        default: "config.yaml",
        describe: "Path to config file (yaml|yml)",
      }),
    async (argv) => {
      const config = await loadConfig(argv.config);
      const result = await runScan(config);

      console.log(formatScanResult(result));
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
