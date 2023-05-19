/**
 * This file contains helper functions to work with Typescript AST nodes and diagnostics
 */

import ts from 'typescript';
import type { Node, SourceFile, TypeChecker, TypeNode } from 'typescript';

const {
  findAncestor,
  getLineAndCharacterOfPosition,
  isCatchClause,
  isIdentifier,
  isJsxElement,
  isJsxFragment,
  isSourceFile,
  isTypeReferenceNode,
} = ts;

/**
 * Checks if node starts with `start` position and its length equals to `length`.
 */
export function isNodeAtPosition(node: Node, start: number, length: number): boolean {
  return node.getStart() === start && node.getEnd() === start + length;
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
  const visitor = (node: Node): Node | undefined => {
    if (isNodeAtPosition(node, start, length)) {
      return node;
    }

    if (node.getStart() <= start && node.getEnd() >= start + length) {
      return ts.forEachChild(node, visitor);
    }

    return undefined;
  };

  return visitor(sourceFile);
}

export function findNodeEndsAtPosition(sourceFile: SourceFile, pos: number): Node | undefined {
  let previousNode: ts.Node = sourceFile;

  const visitor = (node: Node): Node | undefined => {
    // Looking for a not that comes right after the target node...
    if (node.getStart() >= pos) {
      // ... and check the previous node children
      return ts.forEachChild(previousNode, visitor);
    }

    previousNode = node;
  };

  ts.forEachChild(sourceFile, visitor);

  return previousNode;
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

  return node.getText() === catchClauseNode.variableDeclaration.getText();
}

export function canTypeBeResolved(checker: TypeChecker, typeNode: TypeNode): boolean {
  if (isTypeReferenceNode(typeNode)) {
    const type = checker.getTypeFromTypeNode(typeNode);
    const typeArguments = typeNode.typeArguments || [];

    const isTypeError = (type: ts.Type): boolean => {
      // Check if Type can't be resolved
      //return (type as unknown as { intrinsicName?: string }).intrinsicName === 'error';
      return type.flags === ts.TypeFlags.Any;
    };

    return !isTypeError(type) && !typeArguments.find((node) => !canTypeBeResolved(checker, node));
  }

  if (ts.isParenthesizedTypeNode(typeNode)) {
    return canTypeBeResolved(checker, typeNode.type);
  }

  if (ts.isTypeLiteralNode(typeNode)) {
    const types = typeNode.members
      .map((member) => (ts.isPropertySignature(member) ? member.type : undefined))
      .filter((member): member is TypeNode => member !== undefined);

    return !types.find((type) => !canTypeBeResolved(checker, type));
  }

  if (ts.isUnionTypeNode(typeNode)) {
    return !typeNode.types.find((type) => !canTypeBeResolved(checker, type));
  }

  if (ts.isFunctionTypeNode(typeNode)) {
    // Types of function types params (params without types are skipped)
    const types = typeNode.parameters
      .map((parameter) => parameter.type)
      .filter((parameter): parameter is TypeNode => parameter !== undefined);

    // Checking a function return type + all available parameter types
    return ![typeNode.type, ...types].find((type) => !canTypeBeResolved(checker, type));
  }

  // Bypass other king of types
  return true;
}
