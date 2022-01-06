import { readFileSync } from "fs";
import { parse } from "json5";
import execa = require("execa");

interface GitDescribe {
  tag: string;
  count: number;
  sha: string;
  dirty: boolean;
}

const VERSION_PATTERN = /_(\d+\.\d+\.\d+)/;
// @ts-expect-error ts-migrate(6133) FIXME: 'git' is declared but its value is never read.
async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execa("git", args, { cwd });
  return stdout;
}

// @ts-expect-error ts-migrate(6133) FIXME: 'sleep' is declared but its value is never read.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'p' implicitly has an 'any' type.
function msToSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

// @ts-expect-error ts-migrate(6133) FIXME: 'readJSON' is declared but its value is never read... Remove this comment to see the full error message
function readJSON<TJson = unknown>(file: string): TJson | undefined {
  const text = readText(file);
  if (text !== undefined) {
    return parse(text);
  }
}

function readText(file: string): string | undefined {
  return readFile(file, "utf8");
}

function readFile(file: string, encoding: "utf8"): string | undefined;
function readFile(
  file: string,
  encoding?: undefined
): Buffer | undefined;
function readFile(
  file: string,
  encoding?: "utf8"
): string | Buffer | undefined {
  try {
    return readFileSync(file, encoding);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw e;
  }
}

// @ts-expect-error ts-migrate(6133) FIXME: 'timestamp' is declared but its value is never rea... Remove this comment to see the full error message
function timestamp(inSeconds = false): number {
  return inSeconds ? Date.now() / 1000 : Date.now();
}

// @ts-expect-error ts-migrate(6133) FIXME: 'parseLongDescribe' is declared but its value is n... Remove this comment to see the full error message
function parseLongDescribe(desc: string): GitDescribe {
  const result = /^(.+)-(\d+)-g([a-f0-9]+)(?:-(dirty))?$/.exec(desc);

  if (!result) {
    throw Error(`Unable to parse ${desc} as a long description`);
  }

  const [, tag, count, sha, dirty] = result;

  return {
    tag,
    count: parseInt(count, 10),
    sha,
    dirty: !!dirty,
  };
}

// @ts-expect-error ts-migrate(6133) FIXME: 'normalizeVersionString' is declared but its value... Remove this comment to see the full error message
function normalizeVersionString(versionString: string): string {
  if (VERSION_PATTERN.test(versionString)) {
    const result = VERSION_PATTERN.exec(versionString);
    return result ? result[1] : versionString;
  }
  return versionString;
}
