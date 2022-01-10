import { readFileSync } from "fs";
import { parse } from "json5";
// import findUp from "find-up";

import execa = require("execa");
import type { GitDescribe } from "./interfaces";

export const VERSION_PATTERN = /_(\d+\.\d+\.\d+)/;

export async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execa("git", args, { cwd });
  return stdout;
}

export async function gitCommit(msg: string): Promise<string> {
  const stdout = await git(
    ["commit", "-m", `chore(deps-dev): [REHEARSAL-BOT] ${msg}`],
    process.cwd()
  );
  return stdout;
}

/**
 * Function to introduce a wait
 *
 * @param ms - how many milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert milliseconds to seconds
 *
 * @param ms - number in milliseconds
 * @returns number in seconds
 */
export function msToSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

export function readJSON<TJson = unknown>(file: string): TJson | undefined {
  const text = readText(file);
  if (text !== undefined) {
    return parse(text);
  }
}

export function readText(file: string): string | undefined {
  return readFile(file, "utf8");
}

export function readFile(file: string, encoding: "utf8"): string | undefined;
export function readFile(
  file: string,
  encoding?: undefined
): Buffer | undefined;
export function readFile(
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

/**
 * Provide current timestamp
 * @param inSeconds - if true, return seconds, otherwise milliseconds
 * @returns timestamp in seconds
 */
export function timestamp(inSeconds = false): number {
  return inSeconds ? Date.now() / 1000 : Date.now();
}

/**
 * Parse the string output from git
 *
 * @param desc - String output of "git describe --tags --long"
 * @returns GitDescribe object
 */
export function parseLongDescribe(desc: string): GitDescribe {
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

/**
 * Convert instances like "foo-web_10.2.3" and "1.2.3" to "1.2.3"
 *
 * @param versionString - version string to convert into just numbers and periods
 * @returns version string with only numbers and periods
 */
export function normalizeVersionString(versionString: string): string {
  if (VERSION_PATTERN.test(versionString)) {
    const result = VERSION_PATTERN.exec(versionString);
    return result ? result[1] : versionString;
  }
  return versionString;
}

// export async function determineProjectName(
//   directory = process.cwd()
// ): Promise<string | null> {
//   const packageJSONPath = await findUp("package.json", {
//     cwd: directory,
//   });

//   if (!packageJSONPath) {
//     return null;
//   }
//   const packageJSON = readJSON<{ name: string }>(packageJSONPath);
//   return packageJSON?.name ?? null;
// }

// rather than explicity setting from node_modules dir we need to handle workspaces use case
export async function getPathToBinary(
  yarnPath: string,
  binaryName: string
): Promise<string> {
  let stdoutMsg;
  // TODO: node-which doesnt play nice with yarn workspaces and volta. this is a workaround with which fallback
  try {
    const { stdout } = await execa(yarnPath, ["node-which", binaryName]);
    stdoutMsg = stdout;
  } catch (error) {
    try {
      const { stdout } = await execa(yarnPath, ["which", binaryName]);
      stdoutMsg = stdout;
    } catch (error) {
      throw new Error(
        `Unable to execute node-which or which for binary path to ${binaryName}`
      );
    }
  }

  try {
    return stdoutMsg
      .split("\n")
      .filter((p) => p.includes(`.bin/${binaryName}`))[0]
      .trim();
  } catch (error) {
    throw new Error(`Unable to find ${binaryName} in ${yarnPath}`);
  }
}

export async function isRepoDirty(
  path: string
): Promise<{ hasUncommittedFiles: boolean; uncommittedFilesMessage: string }> {
  const desc = await git(["describe", "--tags", "--long", "--dirty"], path);
  return {
    hasUncommittedFiles: parseLongDescribe(desc).dirty,
    uncommittedFilesMessage: `You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.`,
  };
}
