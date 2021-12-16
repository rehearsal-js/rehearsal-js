import { dirSync, setGracefulCleanup } from "tmp";
import { join } from "path";
import { createLogger, transports, format } from "winston";
import { writeJSONSync } from "fs-extra";
import { readJSONString } from "./utils";

import type { Logger } from "winston";
import type { TSCLog, ReporterOptions, Report } from "./interfaces";

/**
 * Reporter class which handles the stdout/file report for Rehearsal
 *
 *
 * @param options - ReporterOptions
 */
export default class Reporter {
  private readonly cwd: ReporterOptions["cwd"];
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

  private parseLog(): void {
    this.report.tscLog = readJSONString<TSCLog>(this.streamFile);
    this.report.fileCount = this.report.tscLog.length;
    this.report.cumulativeErrors = this.getCumulativeErrors();
    this.report.uniqueErrors = this.uniqueErrors;
    this.report.uniqueErrorList = Array.from(this.getUniqueErrorsList());

    writeJSONSync(this.filepath, this.report);
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

  public async end(): Promise<void> {
    this.terminalLogger.end();
    this.fileLogger.end();
    this.parseLog();
    // clean tmp files
    setGracefulCleanup();
  }
}
