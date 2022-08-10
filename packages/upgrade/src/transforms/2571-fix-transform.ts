import ts from 'typescript';

import { FixTransform } from '../interfaces/fix-transform';

import { isVariableOfCatchClause, findNodeAtPosition, replaceStrInText } from '../helpers/typescript-ast';
import { getLocation } from '../helpers/transform-utils';
import { DataAggregator, FixResult } from '@rehearsal/reporter';

export class FixTransform2571 extends FixTransform {
  hint = `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixResult => {
    this.dataAggregator = DataAggregator.getInstance(diagnostic);
    // let result = getInitialResult(diagnostic);

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if(!errorNode) {
      return this.dataAggregator.getResult();
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

      this.dataAggregator.addCodemodDataToResult(diagnostic.file.fileName, text, expression, ['modified'], location);

    } else {
      this.hint = `Object is of type '{0}'. Specify a type of ${errorNodeText}, use type assertion: \`(${errorNodeText} as DesiredType)\` or type guard: \`if (${errorNodeText} instanceof DesiredType) { ... }\``;
      this.dataAggregator.addCommentDataToResult(diagnostic.file.fileName, this.hint, ['modified'], location);
    }

    return this.dataAggregator.getResult();
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
