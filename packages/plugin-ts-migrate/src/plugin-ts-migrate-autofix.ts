/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin } from "ts-migrate-server";
import jscodeshift from "jscodeshift";
import { diagnosticAutofix } from "@rehearsal/tsc-transforms";
import debug from "debug";

import type { SourceFile } from "typescript";
import type { SourceLocation } from "jscodeshift";
import type { TSCLog, TSCLogError } from "@rehearsal/reporter";

const TS_PARSER = jscodeshift.withParser("ts");
const DEBUG_CALLBACK = debug("rehearsal:plugin-autofix");

interface SourceFileExt extends SourceFile {
  commentDirectives: [{ range: { pos: number; end: number }; type: number }];
}

type DiagnosticSource = {
  source: string;
  sourceLocation: SourceLocation;
};

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
  async run({ text, options, fileName, sourceFile }) {
    const root = TS_PARSER(text);
    const reporter = options.reporter;
    const { commentDirectives } = sourceFile as unknown as SourceFileExt;
    const diagnosticSources: DiagnosticSource[] = [];
    // TODO: write additional methods for error reporting with context this should be a class instance
    const tscLog: TSCLog = {
      filePath: fileName,
      cumulativeErrors: 0,
      uniqueErrors: 0,
      uniqueErrorList: [],
      autofixedCumulativeErrors: 0,
      autofixedErrorList: [],
      errors: [],
    };

    // for each sourceFile grab all commentsDirectives
    // which only contain the string position of the comment
    // and parse the diagnostic code and comment text
    if (commentDirectives) {
      commentDirectives.forEach(({ range }) => {
        diagnosticSources.push({
          source: text.slice(range.pos, range.end),
          sourceLocation: new SourceLocationEntry(
            [range.pos, range.pos],
            [range.end, range.end]
          ),
        });
      });
    }

    diagnosticSources.forEach(({ source, sourceLocation }) => {
      if (source.includes("ts-migrate")) {
        // eg "(2307)"
        const diagnosticMatch = source.match("([0-9]+)") as [string];
        const diagnosticCode = diagnosticMatch[0];
        DEBUG_CALLBACK(`diagnosticCode: ${diagnosticCode}`);

        if (diagnosticCode.length > 0) {
          try {
            // run some transform
            // astPath = diagnosticAutofix[diagnosticCode].transform(
            //   root,
            //   astPath
            // );

            // DEBUG_CALLBACK("astPath.name", astPath.name);

            // TODO: the source should not be commentText but the source of the astPath
            // TODO: the parseHelp() should be passed the positional information from the transform
            const errorEntry = new ErrorEntry({
              errorCode: diagnosticCode,
              errorCategory: diagnosticAutofix[diagnosticCode].category,
              errorMessage: source,
              helpMessage: diagnosticAutofix[diagnosticCode].parseHelp([
                "string",
                "number",
              ]),
              source: source,
              sourceLocation: sourceLocation,
            });

            tscLog.errors.push(errorEntry);
          } catch (error) {
            DEBUG_CALLBACK("error", `${error}`);

            reporter.terminalLogger.error(
              `Rehearsal autofix transform for typescript diagnostic code: ${diagnosticCode} failed or does not exist`
            );
          }
        }
      }
    });

    DEBUG_CALLBACK("logging entry %O", tscLog);
    // log the entry to the tmp file stream
    reporter.fileLogger.log("info", "tsc-log-entry-rehearsal", tscLog);

    return root.toSource();
  },
};

export default pluginTSMigrateAutofix;
