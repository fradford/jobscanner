// need to scrape job boards and probably do some keyword ranking or something
// I do wonder if this is a matching problem... maybe some fun stuff there.

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs()
  .scriptName("jobscanner")
  .usage("$0 <cmd> [args]")
  .help()
  .parse(hideBin(process.argv));
