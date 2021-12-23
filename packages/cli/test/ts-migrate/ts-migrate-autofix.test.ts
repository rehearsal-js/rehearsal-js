import { resolve } from "path";
import { Reporter } from "@rehearsal/reporter";
import { sleep } from "../../src/utils";

import { tsMigrateAutofix } from "../../src/index";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const reporter = new Reporter({ cwd: process.cwd() });
reporter.setCWD(FIXTURE_APP_PATH);

async function run() {
  const exitCode = await tsMigrateAutofix(FIXTURE_APP_PATH, reporter);
  await sleep(2000);
  await reporter.end();

  console.log(exitCode);
}

run();
