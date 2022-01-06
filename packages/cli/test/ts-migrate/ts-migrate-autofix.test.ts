import { resolve } from "path";
import { Reporter } from "@rehearsal/reporter";

import { tsMigrateAutofix } from "../../src/index";

// this test assumes ts-migrate has already been run with "ts-migrate" comments
const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app_with_comments");
const reporter = new Reporter({ cwd: process.cwd() });
reporter.setCWD(FIXTURE_APP_PATH);

async function run() {
  const exitCode = await tsMigrateAutofix(FIXTURE_APP_PATH, reporter);
  await reporter.end();

  console.log(exitCode);
}

run();
