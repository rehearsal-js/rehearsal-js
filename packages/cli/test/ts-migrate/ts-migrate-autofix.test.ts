import { resolve } from "path";
import { Reporter } from "@rehearsal/reporter";
import { tsMigrateAutofix } from "../../src/index";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const reporter = new Reporter({ cwd: process.cwd() });
reporter.setCWD(FIXTURE_APP_PATH);

tsMigrateAutofix(FIXTURE_APP_PATH, reporter);
