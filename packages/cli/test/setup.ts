import { setGracefulCleanup } from "tmp";
import { after, before } from "mocha";
import execa = require("execa");

import { getPathToBinary } from "../src";
import { YARN_PATH } from "./test-helpers";

let TSC_VERSION = "";

before(async () => {
  // get the current version of tsc and install it once testing is done
  const tscBinary = await getPathToBinary(YARN_PATH, "tsc");
  const { stdout } = await execa(tscBinary, ["--version"]);
  // stdout "Version N.N.N" split at the space
  TSC_VERSION = stdout.split(" ")[1];
});

after(async () => {
  await execa(YARN_PATH, [
    "add",
    "-D",
    `typescript@${TSC_VERSION}`,
    "--ignore-scripts"
  ]);
  setGracefulCleanup();
});
