import { Plugin } from 'ts-migrate-server';
import { diagnosticAutofix } from '@rehearsal/tsc-transforms';
import debug from 'debug';
import * as recast from 'recast';

import type { TSCLog, TSCLogError, Reporter } from '@rehearsal/reporter';
import type { types } from 'recast';
import type { NodePathComment } from '@rehearsal/tsc-transforms';

const DEBUG_CALLBACK = debug('rehearsal:plugin-autofix');
let reporter: Reporter;

interface TPluginOptions {
  reporter: Reporter;
  updateCommentsOnly?: boolean;
}

interface CommentLineExt extends types.namedTypes.CommentLine {
  start: number;
  end: number;
}

type DiagnosticSource = {
  diagnosticLookupID: string;
  commentNode: CommentLineExt;
  isAutofixed: boolean;
};

class ErrorEntry implements TSCLogError {
  errorCode: string;
  errorCategory: string;
  errorMessage: string;
  stringLocation: { start: number; end: number } = {
    start: 0,
    end: 0,
  };
  helpMessage = '';
  isAutofixed: boolean;
  constructor(args: TSCLogError) {
    this.errorCode = args.errorCode;
    this.errorCategory = args.errorCategory;
    this.errorMessage = args.errorMessage;
    this.stringLocation = args.stringLocation;
    this.helpMessage = args.helpMessage;
    this.isAutofixed = args.isAutofixed;
  }
}

function logErrorEntry(commentEntry: DiagnosticSource): ErrorEntry {
  const { diagnosticLookupID, commentNode, isAutofixed } = commentEntry;
  const entry = {
    errorCode: diagnosticLookupID,
    errorCategory: '',
    errorMessage: commentNode.value,
    helpMessage: '',
    stringLocation: { start: commentNode.start, end: commentNode.end },
    isAutofixed,
  };

  if (diagnosticAutofix[diagnosticLookupID]) {
    entry.errorCategory = diagnosticAutofix[diagnosticLookupID].category;
    // eg " @ts-expect-error ts-migrate(7006) Parameter 'p' implicitly has an 'any' type."
    entry.helpMessage = diagnosticAutofix[diagnosticLookupID].parseHelp(commentNode.value);
  }

  return new ErrorEntry(entry);
}

function runTransform(
  astPath: NodePathComment,
  tscLog: Pick<TSCLog, 'filePath' | 'errors'>
): NodePathComment {
  // log the comment
  const commentEntry: DiagnosticSource = {
    commentNode: astPath.value,
    diagnosticLookupID: astPath.value.value.match('([0-9]+)')[0],
    isAutofixed: false,
  };
  const { diagnosticLookupID } = commentEntry;

  // eg "(2307)"
  DEBUG_CALLBACK(`diagnosticCode: ${diagnosticLookupID}`);

  try {
    const transformLookup = diagnosticAutofix[diagnosticLookupID];
    // if we have a transform for this diagnostic id, apply it
    if (transformLookup) {
      DEBUG_CALLBACK('transform', transformLookup);
      const { isSuccess, path } = transformLookup.transform(astPath);

      if (isSuccess) {
        commentEntry.isAutofixed = true;
      }

      tscLog.errors.push(logErrorEntry(commentEntry));

      return path;
    }
  } catch (error) {
    DEBUG_CALLBACK('error', `${error}`);
  }

  // log not matter what
  tscLog.errors.push(logErrorEntry(commentEntry));

  return astPath;
}

/**
 * This ts-migrate plugin will match against "ts-migrate" comments per file
 * parse the typescript diagnostic code into a more helpful comment
 * and if possible will autofix and mitigate based on the diagnostic code
 */
const pluginTSMigrateAutofix: Plugin<TPluginOptions> = {
  name: 'plugin-ts-migrate-autofix',
  async run({ text, options, fileName }) {
    const tsAST: types.ASTNode = recast.parse(text, {
      parser: require('recast/parsers/typescript'),
    });
    const tscLog: Pick<TSCLog, 'filePath' | 'errors'> = {
      filePath: fileName,
      errors: [],
    };

    reporter = options.reporter;

    recast.visit(tsAST, {
      visitComment(astPath: NodePathComment) {
        if (astPath.value.value.includes('ts-migrate')) {
          // execute the transform
          astPath = runTransform(astPath, tscLog);
        }

        this.traverse(astPath);
      },
    });

    // log the entry to the filelog stream
    reporter.fileLogger.log('info', 'tsc-log-entry-rehearsal', tscLog);

    DEBUG_CALLBACK('logging entry %O', tscLog);

    return recast.print(tsAST).code;
  },
};

export default pluginTSMigrateAutofix;
