import { dirSync, setGracefulCleanup } from "tmp";
import { join } from "path";
import { createLogger, transports, format } from "winston";
import { writeJSON } from "fs-extra";
import { readJSONString } from "./utils";
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
      startedDateTime: new Date().toISOString(),
      tscVersion: options.tscVersion || "",
      fileCount: 0,
      cumulativeErrors: 0,
      uniqueErrors: 0,
      uniqueErrorList: [],
      autofixedErrorList: [],
      autofixedCumulativeErrors: 0,
      tscLog: [],
    };
  }

  private async parseLog(): Promise<void> {
    this.report.tscLog = readJSONString<TSCLog>(this.streamFile);
    DEBUG_CALLBACK("parseLog()", "log parsed");
    this.report.fileCount = this.report.tscLog.length;
    this.report.cumulativeErrors = this.getCumulativeErrors();
    this.report.uniqueErrors = this.uniqueErrors;
    this.report.uniqueErrorList = Array.from(this.getUniqueErrorsList());

    await writeJSON(this.filepath, this.report);
    DEBUG_CALLBACK("parseLog()", "report written to file");
  }

  private getCumulativeErrors(): number {
    return this.report.tscLog.reduce((acc, curr) => {
      return acc + curr.errors.length;
    }, 0);
  }

  private getUniqueErrorsList(): Set<string> {
    const uniqueErrors = new Set<string>();
    this.report.tscLog.forEach((log) => {
      log.errors.forEach((error) => {
        uniqueErrors.add(error.errorCode);
      });
    });
    return uniqueErrors;
  }

  private get uniqueErrors(): number {
    return this.getUniqueErrorsList().size;
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
  }
}
