/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 OSS TypeScript Diagnostic Messages
 https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json

 Align with OSS TypeScript Coding Guidelines which are versioned for Diagnostic Messages
 Likely these should be versioned within a mono-repo
 https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines
*/

import type { ASTPath, Collection } from "jscodeshift";

import { tsMigrateComments } from "./transforms";
import { strPositionalReplacement } from "./utils";

export type Autofix = {
  code: number;
  help: string;
  category: string;
  transform: (
    root: Collection<any>,
    context_ast_path: ASTPath<any>
  ) => ASTPath<any>;
  parseHelp: (...args: any[]) => string;
};

class DiagnosticAutofix implements Autofix {
  constructor(
    public code: number,
    public help: string,
    public category: string,
    public transform: (
      root: Collection<any>,
      context_ast_path: ASTPath<any>
    ) => ASTPath<any>
  ) {
    return {
      code,
      help,
      category,
      transform,
      parseHelp: this.parseHelp,
    };
  }
  parseHelp(replacements: string[]): string {
    return strPositionalReplacement(this.help, replacements);
  }
}

const DIAGNOSTIC_AUTOFIX: { [key: string]: DiagnosticAutofix } = {
  "2307": new DiagnosticAutofix(
    2307,
    "Try running `yarn add '{0}'.`",
    "error",
    (root, context_ast_path) => {
      return tsMigrateComments(root, context_ast_path);
    }
  ),
  "2322": new DiagnosticAutofix(
    2322,
    "Try changing type '{0}' to type '{1}'.",
    "error",
    (root, context_ast_path) => {
      return tsMigrateComments(root, context_ast_path);
    }
  ),
  "2345": new DiagnosticAutofix(
    2345,
    "Try changing type '{0}' to type '{1}'.",
    "error",
    (root, context_ast_path) => {
      return tsMigrateComments(root, context_ast_path);
    }
  ),
  "6133": new DiagnosticAutofix(
    6133,
    "'{0}' is declared but its value is never read.",
    "error",
    (root, context_ast_path) => {
      return tsMigrateComments(root, context_ast_path);
    }
  ),
};

export default DIAGNOSTIC_AUTOFIX;
