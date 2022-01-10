import { setGracefulCleanup } from "tmp";
import { YARN_PATH } from "./test-helpers";
import { getPathToBinary } from "../src/utils";
import execa = require("execa");

let TSC_VERSION = "";

// grab the current tsc version
before(async () => {
  const tscBinary = await getPathToBinary(YARN_PATH, "tsc");
  const { stdout } = await execa(tscBinary, ["--version"]);
  // stdout "Version N.N.N" split at the space
  TSC_VERSION = stdout.split(" ")[1];
});

after(async () => {
  await execa(YARN_PATH, [
    "add",
    "-D",
    `typescript@~${TSC_VERSION}`,
    "--ignore-scripts"
  ]);
  setGracefulCleanup();
});
