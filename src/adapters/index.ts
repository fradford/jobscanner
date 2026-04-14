import type { JobSourceConfig } from "../types";
import { greenhouseAdapter } from "./greenhouse";
import { staticAdapter } from "./static";
import type { SourceAdapter } from "./types";

export function dispatchAdapter(
  source: JobSourceConfig,
): SourceAdapter<JobSourceConfig> {
  switch (source.type) {
    case "greenhouse":
      return greenhouseAdapter as SourceAdapter<JobSourceConfig>;
    case "static":
      return staticAdapter as SourceAdapter<JobSourceConfig>;
  }
}
