/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin } from "ts-migrate-server";
import { diagnosticAutofix } from "@rehearsal/tsc-transforms";
import debug from "debug";
import * as recast from "recast";

import type { TSCLog, TSCLogError, Reporter } from "@rehearsal/reporter";
import type { types } from "recast";
import type { NodePath } from "ast-types/lib/node-path";

const DEBUG_CALLBACK = debug("rehearsal:plugin-autofix");
let reporter: Reporter;

interface CommentLineExt extends types.namedTypes.CommentLine {
  start: number;
  end: number;
}

// NodePath<Comment> should have node.leadingComments
interface NodePathComment extends NodePath<types.namedTypes.Comment, any> {
  node: any;
}

type DiagnosticSource = {
  diagnosticLookupID: string;
  commentNode: CommentLineExt;
};

class ErrorEntry implements TSCLogError {
  errorCode: string;
  errorCategory: string;
  errorMessage: string;
  stringLocation: { start: number; end: number } = {
    start: 0,
    end: 0,
  };
  helpMessage = "";
  constructor(args: TSCLogError) {
    this.errorCode = args.errorCode;
    this.errorCategory = args.errorCategory;
    this.errorMessage = args.errorMessage;
    this.stringLocation = args.stringLocation;
    this.helpMessage = args.helpMessage;
  }
}

function logErrorEntry(commentEntry: DiagnosticSource): ErrorEntry {
  const { diagnosticLookupID, commentNode } = commentEntry;
  return new ErrorEntry({
    errorCode: diagnosticLookupID,
    errorCategory: diagnosticAutofix[diagnosticLookupID].category,
    errorMessage: commentNode.value,
    helpMessage: diagnosticAutofix[diagnosticLookupID].parseHelp([
      "string",
      "number",
    ]),
    stringLocation: { start: commentNode.start, end: commentNode.end },
  });
}

function runTransform(
  astPath: NodePathComment,
  diagnosticLookupID: string
): any {
  try {
    const transformLookup = diagnosticAutofix[diagnosticLookupID];
    // if we have a trasform for this diagnostic id, apply it
    if (transformLookup) {
      DEBUG_CALLBACK("transform", transformLookup);

      return transformLookup.transform(astPath);
    }
  } catch (error) {
    DEBUG_CALLBACK("error", `${error}`);
    // log the failure
    const msg = `Rehearsal autofix transform for typescript diagnostic code: ${diagnosticLookupID} failed or does not exist`;
    reporter.terminalLogger.error(msg);
    reporter.fileLogger.error(msg);
  }

  return astPath;
}

/**
 * This ts-migrate plugin will match against "ts-migrate" comments per file
 * parse the typescript diagnostic code into a more helpful comment
 * and if possible will autofix and mitigate based on the diagnostic code
 */
const pluginTSMigrateAutofix: Plugin<any> = {
  name: "plugin-ts-migrate-autofix",
  async run({ text, options, fileName }) {
    const tsAST: types.ASTNode = recast.parse(text, {
      parser: require("recast/parsers/typescript"),
    });

    reporter = options.reporter;
    const tscLogErrors: TSCLogError[] = [];
    const tscLog: TSCLog = {
      filePath: fileName,
      cumulativeErrors: 0,
      uniqueErrors: 0,
      uniqueErrorList: [],
      autofixedCumulativeErrors: 0,
      autofixedErrorList: [],
      errors: [],
    };

    recast.visit(tsAST, {
      visitComment(astPath: NodePathComment) {
        const commentNode = astPath.value;
        const comment = commentNode.value;
        if (comment.includes("ts-migrate")) {
          // log the comment
          const commentEntry: { commentNode: any; diagnosticLookupID: string } =
            {
              commentNode,
              diagnosticLookupID: comment.match("([0-9]+)")[0],
            };

          // eg "(2307)"
          DEBUG_CALLBACK(`diagnosticCode: ${commentEntry.diagnosticLookupID}`);
          tscLogErrors.push(logErrorEntry(commentEntry));

          // execute the transform
          astPath = runTransform(astPath, commentEntry.diagnosticLookupID);
        }

        this.traverse(astPath);
      },
    });

    reporter.fileLogger.log("info", "tsc-log-entry-rehearsal", tscLog);

    DEBUG_CALLBACK("logging entry %O", tscLog);

    // const content = recast.print(TS_AST).code;
    // writeFileSync(filePath, content, { encoding: "utf8", flag: "w" });

    return recast.print(tsAST).code;
    // return root.toSource();
  },
};

export default pluginTSMigrateAutofix;
