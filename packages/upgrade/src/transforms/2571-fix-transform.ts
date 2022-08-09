import ts from 'typescript';

import { FixTransform, type FixResult } from '../interfaces/fix-transform';

import { isVariableOfCatchClause, findNodeAtPosition, replaceStrInText } from '../helpers/typescript-ast';
import { getInitialResult, addCodemodDataToResult, getLocation, addCommentDataToResult } from '../helpers/transform-utils';

export class FixTransform2571 extends FixTransform {
  hint = `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixResult => {
    let result = getInitialResult(diagnostic);

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if(!errorNode) {
      return result;
    }

    const location = getLocation(diagnostic.file, diagnostic.start);
    const errorNodeText = errorNode.getText();

    if (ts.isIdentifier(errorNode) && isVariableOfCatchClause(errorNode)) {
      let expression;
      if (isPropertyOfErrorInterface(errorNode.parent)) {
        expression = `(${errorNodeText} as Error)`;

      } else {
        expression = `(${errorNodeText} as any)`;
      }
      
      const text = replaceStrInText(diagnostic.file.getFullText(), diagnostic.start, diagnostic.length, expression);

      result = addCodemodDataToResult(result, diagnostic.file.fileName, text, expression, ['modified'], location);

    } else {
      this.hint = `Object is of type '{0}'. Specify a type of ${errorNodeText}, use type assertion: \`(${errorNodeText} as DesiredType)\` or type guard: \`if (${errorNodeText} instanceof DesiredType) { ... }\``;
      result = addCommentDataToResult(result, diagnostic.file.fileName, this.hint, ['modified'], location);
    }

    return result;
  };
}

/**
 * Checks if the `node` is a part of property access expression and is a member of the `Error` interface
 */
function isPropertyOfErrorInterface(node: ts.Node): boolean {
  const errorProps: string[] = ['name', 'message', 'stack'];

  if (ts.isPropertyAccessExpression(node)) {
    return errorProps.includes(node.name.getText());
  }

  return false;
}
