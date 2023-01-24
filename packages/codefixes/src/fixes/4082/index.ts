import {
  ChangesFactory,
  findNodeAtPosition,
  getTypeDeclarationFromTypeSymbol,
  isSubtypeOf,
  isTypeMatched,
} from '@rehearsal/utils';
import {
  flattenDiagnosticMessageText,
  isExportAssignment,
  isObjectLiteralExpression,
} from 'typescript';
import { createCodeFixAction } from '../../hints-codefix-collection';
import type {
  CodeFixAction,
  ExportAssignment,
  Node,
  ObjectLiteralExpression,
  PropertyAssignment,
  Type,
  TypeChecker,
  TypeReference,
} from 'typescript';
import type { CodeFix, DiagnosticWithContext } from '../../types';

const EXPORT_KEYWORD_WITH_SPACE = 'export ';

export class Fix4082 implements CodeFix {
  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !isExportAssignment(errorNode)) {
      return undefined;
    }

    /**
     * For example, targetTypeString is 'Props'
     * typeType is the type object that corresponds to targetTypeString
     * parentType is the type object that has the type string of: '({ name: string, age: number} : Props): JXS.Element'
     **/
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '. ');
    const targetTypeString = this.getTargetTypeName(message);

    if (!targetTypeString) {
      return undefined;
    }

    const parentType = this.findParentTypeInExportAssignment(
      errorNode,
      targetTypeString,
      diagnostic.checker
    );

    if (!parentType) {
      return undefined;
    }

    const targetType = this.findTargetTypeInParentType(
      targetTypeString,
      parentType,
      diagnostic.checker
    );
    const targetTypeDeclaration = targetType && getTypeDeclarationFromTypeSymbol(targetType);

    if (!targetTypeDeclaration) {
      return undefined;
    }

    const changes = ChangesFactory.insertText(
      targetTypeDeclaration.getSourceFile(),
      targetTypeDeclaration.getStart(),
      EXPORT_KEYWORD_WITH_SPACE
    );

    return createCodeFixAction(
      'addMissingExport',
      [changes],
      'Add the export keyword to missing type'
    );
  }

  getTargetTypeName(message: string): string | undefined {
    const matches = message.match(/'([^']+)'/);
    if (matches && matches.length > 1) {
      return matches[1];
    }

    return undefined;
  }

  findParentTypeInExportAssignment(
    exportAssignment: ExportAssignment,
    targetTypeString: string,
    checker: TypeChecker
  ): Type | undefined {
    const expression = exportAssignment.expression;
    let parentType: Type | undefined;
    if (isObjectLiteralExpression(expression)) {
      parentType = this.findTypeInObjectLiteralExpression(expression, targetTypeString, checker);
    } else {
      parentType = checker.getTypeAtLocation(expression);
    }

    return parentType;
  }

  findTypeInObjectLiteralExpression(
    expression: ObjectLiteralExpression,
    targetTypeStr: string,
    checker: TypeChecker
  ): Type | undefined {
    for (const prop of expression.properties) {
      const type = checker.getTypeAtLocation((prop as PropertyAssignment).initializer);
      if (isSubtypeOf(targetTypeStr, type, checker)) {
        return type;
      }
    }

    return undefined;
  }

  findNodeByText(node: Node, text: string): Node | undefined {
    const children = Array.from(node.getChildren());
    for (const child of children) {
      const childText = child.getText();
      if (childText === text) {
        return child;
      } else if (childText.match(new RegExp('\\b' + text + '\\b'))) {
        return this.findNodeByText(child, text);
      }
    }

    return undefined;
  }

  findTargetTypeInParentType(
    targetTypeString: string,
    parentType: Type,
    checker: TypeChecker
  ): Type | undefined {
    let targetType: Type | undefined;

    if (parentType.symbol) {
      const parentTypeDeclaration = getTypeDeclarationFromTypeSymbol(parentType);
      const targetTypeNode =
        parentTypeDeclaration && this.findNodeByText(parentTypeDeclaration, targetTypeString);
      targetType = targetTypeNode && checker.getTypeAtLocation(targetTypeNode);
    } else {
      targetType = this.findTypeInCompositeType(parentType, targetTypeString, checker);
    }

    return targetType;
  }

  findTypeInCompositeType(
    type: Type,
    subTypeString: string,
    checker: TypeChecker
  ): Type | undefined {
    if (!isSubtypeOf(subTypeString, type, checker)) {
      return undefined;
    }
    if (type.isUnionOrIntersection()) {
      for (const t of type.types) {
        if (isTypeMatched(subTypeString, t)) {
          return t;
        } else if (isSubtypeOf(subTypeString, t, checker)) {
          return this.findTypeInCompositeType(t, subTypeString, checker);
        }
      }
    } else {
      const typeArguments = checker.getTypeArguments(type as TypeReference);
      if (typeArguments.length > 0) {
        for (const t of typeArguments) {
          if (isTypeMatched(subTypeString, t)) {
            return t;
          } else if (isSubtypeOf(subTypeString, t, checker)) {
            return this.findTypeInCompositeType(t, subTypeString, checker);
          }
        }
      }

      const aliasTypeArguments = type.aliasTypeArguments;
      if (aliasTypeArguments && aliasTypeArguments.length > 0) {
        for (const t of aliasTypeArguments) {
          if (isTypeMatched(subTypeString, t)) {
            return t;
          } else if (isSubtypeOf(subTypeString, t, checker)) {
            return this.findTypeInCompositeType(t, subTypeString, checker);
          }
        }
      }
    }

    return undefined;
  }
}
