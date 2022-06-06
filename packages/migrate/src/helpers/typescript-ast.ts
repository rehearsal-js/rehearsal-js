/**
 * This file contains helper functions to work with Typescript AST nodes and diagnostics
 */

import ts from 'typescript';

/**
 * Find the diagnosed node and passes it to `transformer` function.
 * The `transform` function have to return modified node or `undefined` to remove node from AST.
 */
export function transformDiagnosedNode(
  diagnostic: ts.DiagnosticWithLocation,
  transformer: (node: ts.Node) => ts.Node | undefined
): string {
  const result = ts.transform(diagnostic.file, [
    (context) => {
      const visit: ts.Visitor = (node) => {
        return isNodeDiagnosed(node, diagnostic)
          ? transformer(node)
          : ts.visitEachChild(node, visit, context);
      };

      return (node) => ts.visitNode(node, visit);
    },
  ]);

  return ts
    .createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
    })
    .printFile(result.transformed[0]);
}

/**
 * Checks if node starts with `start` position and its length equals to `length`.
 */
export function isNodeAtPosition(node: ts.Node, start: number, length: number): boolean {
  return node.getStart() === start && node.getEnd() === start + length;
}

/**
 * Checks if node is the node related to diagnostic.
 */
export function isNodeDiagnosed(node: ts.Node, diagnostic: ts.DiagnosticWithLocation): boolean {
  return isNodeAtPosition(node, diagnostic.start, diagnostic.length);
}

/**
 * Checks if node is the first in the line.
 * e.g. for the node `revert` of `function revert(...)` the `function` is the first in the line.
 */
export function isTheFirstParentNodeInTheLIne(node: ts.Node): boolean {
  if (node.parent === undefined || ts.isSourceFile(node.parent)) {
    return true;
  }

  const sourceFile = node.getSourceFile();
  const currentPosition = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
  const parentPosition = ts.getLineAndCharacterOfPosition(sourceFile, node.parent.getStart());

  return currentPosition.line > parentPosition.line;
}

/**
 * Finds a node at particular position in the file.
 * e.g. for (`function revert(...)`, 9, 6) the `revert` is the node starts at 9 with length 6.
 */
export function findNodeAtPosition(
  sourceFile: ts.SourceFile,
  start: number,
  length: number
): ts.Node | undefined {
  const visitor = (node: ts.Node): ts.Node | undefined =>
    isNodeAtPosition(node, start, length) ? node : ts.forEachChild(node, visitor);

  return visitor(sourceFile);
}

/**
 * Finds the first node in the line.
 * e.g. in `function revert(...)` the `revert` node has `function` node is the first in the line.
 */
export function findTheFirstParentNodeInTheLine(node: ts.Node): ts.Node {
  const visit = (node: ts.Node): ts.Node =>
    isTheFirstParentNodeInTheLIne(node) ? node : visit(node.parent);

  return visit(node);
}

/**
 * Checks if the node is the part of JSX Text (Element or Fragment)
 */
export function isJsxTextNode(node: ts.Node): boolean {
  const visit = (node: ts.Node): boolean => {
    if (node === undefined || ts.isSourceFile(node)) {
      return false;
    }

    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      return true;
    }

    return visit(node.parent);
  };

  return visit(node);
}

export function insertIntoText(text: string, insertAt: number, strToInsert: string): string {
  const newText = `${text.substring(0, insertAt)}${strToInsert}${text.substring(insertAt)}`;
  return newText;
}
