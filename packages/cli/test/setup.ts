import { setGracefulCleanup } from "tmp";
import { after } from "mocha";
import { resolve } from "path";
import { restoreLocalGit } from "./test-helpers";

const FIXTURE_APP_PATH = resolve(__dirname, "./fixtures/app");

after(async () => {
  await restoreLocalGit(FIXTURE_APP_PATH);
  setGracefulCleanup();
});
