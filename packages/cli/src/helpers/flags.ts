/*
! ALL VARIABLES NAMES HERE MUST BE CASED UNDERSCORE AND NOT CAMEL FOR THE CLI
*/

import { flags } from "@oclif/command";
import semver = require("semver");

export const build = flags.build({
  char: "b",
  description: "typescript build variant",
  options: ["beta", "next", "latest"],
});

export const src_dir = flags.build({
  char: "s",
  description: "typescript source directory",
});

export const is_test = flags.boolean({
  hidden: true,
});

export const autofix = flags.boolean({
  char: "a",
  description: "autofix tsc errors where available",
});

export const dry_run = flags.boolean({
  char: "d",
  description: "dry run. dont commit any changes. reporting only.",
});

export const tsc_version = flags.build({
  char: "t",
  description:
    "override the build variant by specifying the typescript compiler version as n.n.n",
  parse: (input: string): string => {
    if (!semver.valid(input)) {
      throw new Error(
        "The tsc_version specified is an invalid string. Please specify a valid version as n.n.n"
      );
    } else {
      return input;
    }
  },
});

export const report_output = flags.build({
  description: "set the directory for the report output",
});
