/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Collection, ASTPath, Comment } from "jscodeshift";

import { withParser } from "jscodeshift";

const TS_PARSER = withParser("ts");

// TODO: remove me
export function identifierReverseExample(
  root: Collection,
  _context_ast_path: ASTPath<Comment>
): string {
  return root
    .find(TS_PARSER.Identifier)
    .replaceWith((p) => {
      return {
        ...p.node,
        name: p.node.name.split("").reverse().join(""),
      };
    })
    .toSource();
}

export function tsMigrateComments(
  _root: Collection,
  contextASTPath: ASTPath<Comment>
): ASTPath<Comment> {
  contextASTPath.value.value =
    contextASTPath.value.value.concat(" FOO FOO FOO");
  return contextASTPath;
}
