/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 OSS TypeScript Diagnostic Messages
 https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json

 Align with OSS TypeScript Coding Guidelines which are versioned for Diagnostic Messages
 Likely these should be versioned within a mono-repo
 https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines
*/

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

export class DiagnosticAutofix implements Autofix {
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
