/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 OSS TypeScript Diagnostic Messages
 https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json

 Align with OSS TypeScript Coding Guidelines which are versioned for Diagnostic Messages
 Likely these should be versioned within a mono-repo
 https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines
*/

import { tsMigrateComments } from "./transforms";
import { strPositionalReplacement } from "./utils";

import type { types } from "recast";
import type { NodePath } from "ast-types/lib/node-path";

// NodePath<Comment> should have node.leadingComments
export interface NodePathComment
  extends NodePath<types.namedTypes.Comment, any> {
  node: any;
}

export interface TransformResponse {
  path: NodePathComment;
  isSuccess: boolean;
}

export type Autofix = {
  code: number;
  help: string;
  category: string;
  transform: (astPath: NodePathComment) => TransformResponse;
  parseHelp: (message: string) => string;
};

class DiagnosticAutofix implements Autofix {
  constructor(
    public code: number,
    public help: string,
    public category: string,
    public transform: (astPath: NodePathComment) => TransformResponse
  ) {
    return {
      code,
      help,
      category,
      transform,
      parseHelp: this.parseHelp,
    };
  }
  // replace the positional arguments with the string replacements for the "help" message
  parseHelp(tsMigrateMessage: string): string {
    // this will expose the parsed diagnostic message coming from the typescript compiler
    // eg. "Parameter 'p' implicitly has an 'any' type." into ["'p'", "'any'"]
    const replacements = tsMigrateMessage.match(/'[^']+'/gm) as string[];
    return strPositionalReplacement(this.help, replacements);
  }
}

// TODO the tsMigrateComments transform is a trivial placeholder example and should be swapped out
const DIAGNOSTIC_AUTOFIX: { [key: string]: DiagnosticAutofix } = {
  "2307": new DiagnosticAutofix(
    2307,
    "Try running `yarn add '{0}'.`",
    "error",
    (astPath) => {
      return tsMigrateComments(astPath);
    }
  ),
  "2322": new DiagnosticAutofix(
    2322,
    "Try changing type '{0}' to type '{1}'.",
    "error",
    (astPath) => {
      return tsMigrateComments(astPath);
    }
  ),
  "2345": new DiagnosticAutofix(
    2345,
    "Try changing type '{0}' to type '{1}'.",
    "error",
    (astPath) => {
      return tsMigrateComments(astPath);
    }
  ),
  "6133": new DiagnosticAutofix(
    6133,
    "'{0}' is declared but its value is never read.",
    "error",
    (astPath) => {
      return tsMigrateComments(astPath);
    }
  ),
};

export default DIAGNOSTIC_AUTOFIX;
