import { Plugin } from "ts-migrate-server";
import jscodeshift from "jscodeshift";
import { diagnosticAutofix } from "@rehearsal-js/tsc-transforms";

import type { SourceLocation } from "jscodeshift";
import type { TSCLog, TSCLogError } from "@rehearsal-js/reporter";

const TS_PARSER = jscodeshift.withParser("ts");

class ErrorEntry implements TSCLogError {
  errorCode: string;
  errorCategory: string;
  errorMessage: string;
  sourceLocation: SourceLocation;
  source = "";
  helpMessage = "";
  constructor(args: TSCLogError) {
    this.errorCode = args.errorCode;
    this.errorCategory = args.errorCategory;
    this.errorMessage = args.errorMessage;
    this.sourceLocation = args.sourceLocation;
    this.source = args.source;
    this.helpMessage = args.helpMessage;
  }
}

class SourceLocationEntry implements SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
  constructor(
    start: [number, number] = [0, 0],
    end: [number, number] = [0, 0]
  ) {
    this.start = { line: start[0], column: start[1] };
    this.end = { line: end[0], column: end[1] };
  }
}

/**
 * This ts-migrate plugin will match against "ts-migrate" comments per file
 * parse the typescript diagnostic code into a more helpful comment
 * and if possible will autofix and mitigate based on the diagnostic code
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pluginTSMigrateAutofix: Plugin<any> = {
  name: "plugin-ts-migrate-autofix",
  async run({ text, options, fileName }) {
    const root = TS_PARSER(text);
    const reporter = options.reporter;

    // TODO write additional methods for error reporting with context
    const tscLog: TSCLog = {
      filePath: fileName,
      cumulativeErrors: 0,
      uniqueErrors: 0,
      uniqueErrorList: [],
      autofixedCumulativeErrors: 0,
      autofixedErrorList: [],
      errors: [],
    };

    // find all comments
    root.find(TS_PARSER.CommentLine).forEach((astPath) => {
      const commentText = astPath.value.value;

      if (commentText.includes("ts-migrate")) {
        // eg "(2307)"
        const diagnosticMatch = commentText.match("([0-9]+)") as [string];
        const diagnosticCode = diagnosticMatch[0];

        // if code is found
        if (diagnosticCode.length > 0) {
          try {
            // const autofix = {
            //   autofix: diagnosticAutofix[diagnosticCode].help,
            // };

            // run some transform
            astPath = diagnosticAutofix[diagnosticCode].transform(
              root,
              astPath
            );

            // TODO the source should not be commentText but the source of the astPath
            // TODO the parseHelp() should be passed the positional information from the transform
            const errorEntry = new ErrorEntry({
              errorCode: diagnosticCode,
              errorCategory: diagnosticAutofix[diagnosticCode].category,
              errorMessage: commentText,
              helpMessage: diagnosticAutofix[diagnosticCode].parseHelp([
                "string",
                "number",
              ]),
              source: commentText,
              sourceLocation: new SourceLocationEntry(
                [
                  astPath.value.loc?.start.line as number,
                  astPath.value.loc?.start.column as number,
                ],
                [
                  astPath.value.loc?.end.line as number,
                  astPath.value.loc?.end.column as number,
                ]
              ),
            });

            tscLog.errors.push(errorEntry);
          } catch (error) {
            reporter.terminalLogger.error(`Rehearsal: Your on your own.`);
          }
        }
      }
    });

    // log the entry to the tmp file stream
    reporter.fileLogger.log("info", "tsc-log-entry", tscLog);

    return root.toSource();
  },
};

export default pluginTSMigrateAutofix;
