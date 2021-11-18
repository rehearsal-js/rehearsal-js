/*
! ALL VARIABLES NAMES HERE MUST BE CASED UNDERSCORE AND NOT CAMEL FOR THE CLI
*/

import { flags } from "@oclif/command";

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
