import { dirSync, setGracefulCleanup } from "tmp";
import { join } from "path";
import { createLogger, transports, format } from "winston";
import { writeJSON } from "fs-extra";
import { readJSONString, sleep } from "./utils";
import debug from "debug";

import type { Logger } from "winston";
import type { TSCLog, ReporterOptions, Report } from "./interfaces";

const DEBUG_CALLBACK = debug("rehearsal:reporter");

/**
 * Reporter class which handles the stdout/file report for Rehearsal
 *
 *
 * @param options - ReporterOptions
 */
export default class Reporter {
  public cwd: ReporterOptions["cwd"];
  public streamFile: string;
  private filepath: string;
  public filename: string;
  public report: Report;
  public terminalLogger: Logger;
  public fileLogger: Logger;

  constructor(options: ReporterOptions = {}) {
    const tmpDir = dirSync().name;
    // this is the private file that will be malformed json from the stream
    this.streamFile = join(tmpDir, ".rehearsal");
    this.cwd = options.cwd || tmpDir;
    // this is the public file that the user will see
    this.filename = options.filename || ".rehearsal.json";
    this.filepath = join(this.cwd, this.filename);

    this.terminalLogger = createLogger({
      defaultMeta: {
        service: "rehearsal",
      },
      transports: [new transports.Console({})],
    });

    this.fileLogger = createLogger({
      defaultMeta: {
        service: "rehearsal",
      },
      transports: [new transports.File({ filename: this.streamFile })],
      format: format.combine(format.json()),
    });

    this.report = {
      projectName: options.projectName || "",
      timestamp: new Date().toISOString(),
      tscVersion: options.tscVersion || "",
      tscLog: [],

      // the number of files that were parsed
      fileCount: 0,
      // the total number of tsc errors found before fixing
      cumulativeErrors: 0,
      // the total number of unique tsc errors found before fixing
      uniqueCumulativeErrors: 0,
      // the unique tsc diagnostic lookup id's found
      uniqueErrorList: [],
      // the fixed total number of tsc errors
      autofixedCumulativeErrors: 0,
      // the fixed and unique tsc diagnostic lookup id's found
      autofixedUniqueErrorList: [],
    };
  }

  // happends after the stream has finished
  private async parseLog(): Promise<void> {
    // build a JSON representation of the log
    this.report.tscLog = readJSONString<TSCLog>(this.streamFile);
    DEBUG_CALLBACK("parseLog()", "log parsed");

    // set all cumulative properties
    this.report.fileCount = this.report.tscLog.length;

    this.report.cumulativeErrors = this.getCumulativeErrors(this.report.tscLog);

    this.report.uniqueCumulativeErrors = this.uniqueCumulativeErrors;
    this.report.uniqueErrorList = Array.from(
      this.getUniqueErrorsList(this.report.tscLog)
    );

    this.report.autofixedUniqueErrorList = Array.from(
      this.getAutofixedUniqueErrorList(this.report.tscLog)
    );
    this.report.autofixedCumulativeErrors = this.autofixedCumulativeErrors;

    await writeJSON(this.filepath, this.report);
    DEBUG_CALLBACK("parseLog()", "report written to file");
  }

  // get the total number of tsc errors found before fixing
  private getCumulativeErrors(tscLog: TSCLog[]): number {
    return tscLog.reduce((acc, curr) => {
      return acc + curr.errors.length;
    }, 0);
  }

  private getAutofixedUniqueErrorList(tscLog: TSCLog[]): Set<string> {
    const uniqueErrors = new Set<string>();
    tscLog.forEach((log) => {
      log.errors.forEach((error) => {
        // if the tsc error was autofixed by rehearsal then add it to the unique errors
        if (error.isAutofixed) {
          uniqueErrors.add(error.errorCode);
        }
      });
    });
    return uniqueErrors;
  }

  private get autofixedCumulativeErrors(): number {
    return this.getAutofixedUniqueErrorList(this.report.tscLog).size;
  }

  private getUniqueErrorsList(tscLog: TSCLog[]): Set<string> {
    const uniqueErrors = new Set<string>();
    tscLog.forEach((log) => {
      log.errors.forEach((error) => {
        uniqueErrors.add(error.errorCode);
      });
    });
    return uniqueErrors;
  }

  private get uniqueCumulativeErrors(): number {
    return this.getUniqueErrorsList(this.report.tscLog).size;
  }

  public set tscVersion(version: string) {
    this.report.tscVersion = version;
  }

  public set projectName(name: string) {
    this.report.projectName = name;
  }

  public setCWD(cwd: string): void {
    this.cwd = cwd;
    this.filepath = join(this.cwd, this.filename);
  }

  public async end(): Promise<void> {
    await sleep(1000);

    DEBUG_CALLBACK("end()", "end called");

    this.fileLogger.on("finish", async () => {
      DEBUG_CALLBACK("end()", "fileLogger on finish event subscribed");

      await this.parseLog();
      setGracefulCleanup();

      DEBUG_CALLBACK("setGracefulCleanup()", "cleanup finsished");
    });

    this.fileLogger.on("error", (err) => {
      throw new Error(`${err}`);
    });

    this.terminalLogger.end();
    DEBUG_CALLBACK("end()", "terminalLogger ended");

    this.fileLogger.end();
    DEBUG_CALLBACK("end()", "fileLogger ended");

    // winston is racing a promise to finish, so we need to wait for it to finish
    // 2 seconds is more than enough
    await sleep(1000);
  }
}
