/**
 * This file contains helper functions to work with Typescript AST nodes and diagnostics
 */

import ts from 'typescript';
import type { DiagnosticWithLocation, Node, SourceFile, Visitor } from 'typescript';

const {
  createPrinter,
  findAncestor,
  forEachChild,
  getLineAndCharacterOfPosition,
  isCatchClause,
  isIdentifier,
  isJsxElement,
  isJsxFragment,
  isSourceFile,
  NewLineKind,
  transform,
  visitEachChild,
  visitNode,
} = ts;

/**
 * Find the diagnosed node and passes it to `transformer` function.
 * The `transform` function have to return modified node or `undefined` to remove node from AST.
 */
export function transformDiagnosedNode(
  diagnostic: DiagnosticWithLocation,
  transformer: (node: Node) => Node | undefined
): string {
  const result = transform(diagnostic.file, [
    (context) => {
      const visit: Visitor = (node) => {
        return isNodeDiagnosed(node, diagnostic)
          ? transformer(node)
          : visitEachChild(node, visit, context);
      };

      return (node) => visitNode(node, visit);
    },
  ]);

  return createPrinter({
    newLine: NewLineKind.LineFeed,
    removeComments: false,
  }).printFile(result.transformed[0]);
}

/**
 * Checks if node starts with `start` position and its length equals to `length`.
 */
export function isNodeAtPosition(node: Node, start: number, length: number): boolean {
  return node.getStart() === start && node.getEnd() === start + length;
}

/**
 * Checks if node is the node related to diagnostic.
 */
export function isNodeDiagnosed(node: Node, diagnostic: DiagnosticWithLocation): boolean {
  return isNodeAtPosition(node, diagnostic.start, diagnostic.length);
}

/**
 * Checks if node is the first in the line.
 * e.g. for the node `revert` of `function revert(...)` the `function` is the first in the line.
 */
export function isTheFirstParentNodeInTheLIne(node: Node): boolean {
  if (node.parent === undefined || isSourceFile(node.parent)) {
    return true;
  }

  const sourceFile = node.getSourceFile();
  const currentPosition = getLineAndCharacterOfPosition(sourceFile, node.getStart());
  const parentPosition = getLineAndCharacterOfPosition(sourceFile, node.parent.getStart());

  return currentPosition.line > parentPosition.line;
}

/**
 * Finds a node at particular position in the file.
 * e.g. for (`function revert(...)`, 9, 6) the `revert` is the node starts at 9 with length 6.
 */
export function findNodeAtPosition(
  sourceFile: SourceFile,
  start: number,
  length: number
): Node | undefined {
  const visitor = (node: Node): Node | undefined =>
    isNodeAtPosition(node, start, length) ? node : forEachChild(node, visitor);

  return visitor(sourceFile);
}

/**
 * Finds the first node in the line.
 * e.g. in `function revert(...)` the `revert` node has `function` node is the first in the line.
 */
export function findTheFirstParentNodeInTheLine(node: Node): Node {
  const visit = (node: Node): Node =>
    isTheFirstParentNodeInTheLIne(node) ? node : visit(node.parent);

  return visit(node);
}

/**
 * Checks if the node is the part of JSX Text (Element or Fragment)
 */
export function isNodeInsideJsx(node: Node): boolean {
  return findAncestor(node, (node) => isJsxElement(node) || isJsxFragment(node)) !== undefined;
}

/**
 * Checks if node is a variable passed in catch clause.
 * This function returns `true` for the variable `e` node (identifier),
 * and returns `false` for `b` node (identifier) in the code below:
 * try { ... } catch(e) { e.message; const b = 'dummy'; };
 */
export function isVariableOfCatchClause(node: Node): boolean {
  // Check if node is a variable (not fully correct)
  if (!isIdentifier(node)) {
    return false;
  }

  // Check if the variable defined in catch clause
  const catchClauseNode = findAncestor(node, isCatchClause);
  if (!catchClauseNode || !catchClauseNode.variableDeclaration) {
    return false;
  }

  return node.getText() === catchClauseNode.variableDeclaration!.getText();
}
