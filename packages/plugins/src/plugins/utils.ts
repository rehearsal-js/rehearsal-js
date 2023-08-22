import ts from 'typescript';

/**
 * The following logic has been ported from https://github.com/airbnb/ts-migrate/blob/master/packages/ts-migrate-plugins/src/plugins/ts-ignore.ts
 **/

export function onMultilineConditionalTokenLine(sourceFile: ts.SourceFile, pos: number): boolean {
  const conditionalExpression = getConditionalExpressionAtPos(sourceFile, pos);
  // Not in a conditional expression.
  if (!conditionalExpression) {
    return false;
  }

  const { line: questionTokenLine } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    conditionalExpression.questionToken.end
  );
  const { line: colonTokenLine } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    conditionalExpression.colonToken.end
  );
  // Single line conditional expression.
  if (questionTokenLine === colonTokenLine) {
    return false;
  }

  const { line } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
  return visitConditionalExpressionWhen(conditionalExpression, pos, {
    // On question token line of multiline conditional expression.
    whenTrue: () => line === questionTokenLine,
    // On colon token line of multiline conditional expression.
    whenFalse: () => line === colonTokenLine,
    otherwise: () => false,
  });
}

export function visitConditionalExpressionWhen<T>(
  node: ts.ConditionalExpression | undefined,
  pos: number,
  visitor: {
    whenTrue(node: ts.ConditionalExpression): T;
    whenFalse(node: ts.ConditionalExpression): T;
    otherwise(): T;
  }
): T {
  if (!node) {
    return visitor.otherwise();
  }

  const inWhenTrue = node.whenTrue.pos <= pos && pos < node.whenTrue.end;
  if (inWhenTrue) {
    return visitor.whenTrue(node);
  }

  const inWhenFalse = node.whenFalse.pos <= pos && pos < node.whenFalse.end;
  if (inWhenFalse) {
    return visitor.whenFalse(node);
  }

  return visitor.otherwise();
}

export function getConditionalExpressionAtPos(
  sourceFile: ts.SourceFile,
  pos: number
): ts.ConditionalExpression | undefined {
  const visitor = (node: ts.Node): ts.ConditionalExpression | undefined => {
    if (node.pos <= pos && pos < node.end && ts.isConditionalExpression(node)) {
      return node;
    }
    return ts.forEachChild(node, visitor);
  };
  return ts.forEachChild(sourceFile, visitor);
}

export function getConditionalCommentPos(sourceFile: ts.SourceFile, pos: number): number {
  return visitConditionalExpressionWhen(getConditionalExpressionAtPos(sourceFile, pos), pos, {
    whenTrue: (node) => node.questionToken.end,
    whenFalse: (node) => node.colonToken.end,
    otherwise: () => pos,
  });
}

export function inTemplateExpressionText(sourceFile: ts.SourceFile, pos: number): boolean {
  const visitor = (node: ts.Node): boolean | undefined => {
    if (node.pos <= pos && pos < node.end && ts.isTemplateExpression(node)) {
      const inHead = node.head.pos <= pos && pos < node.head.end;
      const inMiddleOrTail = node.templateSpans.some(
        (span) => span.literal.pos <= pos && pos < span.literal.end
      );
      if (inHead || inMiddleOrTail) {
        return true;
      }
    }

    return ts.forEachChild(node, visitor);
  };

  return !!ts.forEachChild(sourceFile, visitor);
}

export function findDiagnosticNode(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile
): ts.Node | undefined {
  const visitor = (node: ts.Node): ts.Node | undefined =>
    isDiagnosticNode(node, diagnostic, sourceFile) ? node : ts.forEachChild(node, visitor);

  return visitor(sourceFile);
}

export function isDiagnosticNode(
  node: ts.Node,
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile
): boolean {
  return (
    node.getStart(sourceFile) === diagnostic.start &&
    node.getEnd() === diagnostic.start + diagnostic.length
  );
}

export function inJsxText(sourceFile: ts.SourceFile, pos: number): boolean {
  const visitor = (node: ts.Node): boolean | undefined => {
    if (node.pos <= pos && pos < node.end && (ts.isJsxElement(node) || ts.isJsxFragment(node))) {
      const isJsxTextChild = node.children.some(
        (child) => ts.isJsxText(child) && child.pos <= pos && pos < child.end
      );
      const isClosingElement = !ts.isJsxFragment(node) && node.closingElement.pos === pos;
      if (isJsxTextChild || isClosingElement) {
        return true;
      }
    }

    return ts.forEachChild(node, visitor);
  };

  return !!ts.forEachChild(sourceFile, visitor);
}

export function getBoundaryOfCommentBlock(
  start: number,
  length: number,
  text: string
): { start: number; end: number } {
  const newStart = start - 1 >= 0 && text[start - 1] === '{' ? start - 1 : start;

  let end = start + length - 1;

  end = end + 1 < text.length && text[end + 1] === '}' ? end + 1 : end;
  end = ts.isLineBreak(text.charCodeAt(end + 1)) ? end + 1 : end;

  return {
    start: newStart,
    end,
  };
}
