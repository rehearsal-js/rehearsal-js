import ts from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import {
  isSubtypeOf,
  getTypeDeclarationFromTypeSymbol,
  findNodeByText,
  isTypeMatched,
} from '../helpers/transform-utils';
import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import type RehearsalService from '../rehearsal-service';

const EXPORT_KEYWORD = 'export';
export default class FixTransform4082 extends FixTransform {
  hint = `Default export of the module has or is using private name {0}`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode) {
      return [];
    }

    /**
     * For example, targetTypeString is 'Props'
     * typeType is the type object that corresponds to targetTypeString
     * parentType is the type object that has the type string of: '({ name: string, age: number} : Props): JXS.Element'
     **/
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '. ');
    const targetTypeString = getTargetTypeName(message);
    if (!targetTypeString) {
      return [];
    }

    if (ts.isExportAssignment(errorNode)) {
      const parentType = findParentTypeInExportAssignment(errorNode, targetTypeString, checker);

      if (!parentType) {
        return [];
      }

      const targetType = findTargetTypeInParentType(targetTypeString, parentType, checker);

      const targetTypeDeclaration = targetType && getTypeDeclarationFromTypeSymbol(targetType);
      if (!targetTypeDeclaration) {
        return [];
      }

      const sourceFile = targetTypeDeclaration.getSourceFile();
      const updatedText = insertIntoText(
        sourceFile.getFullText(),
        targetTypeDeclaration.getStart(),
        `${EXPORT_KEYWORD} `
      );

      return [
        {
          fileName: sourceFile.fileName,
          text: updatedText,
        },
      ];
    }
    return [];
  };
}

function getTargetTypeName(message: string): string | undefined {
  const matches = message.match(/'([^']+)'/);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return undefined;
}

function findParentTypeInExportAssignment(
  exportAssignment: ts.ExportAssignment,
  targetTypeString: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  const expression = exportAssignment.expression;
  let parentType: ts.Type | undefined;

  if (ts.isObjectLiteralExpression(expression)) {
    parentType = findTypeInObjectLiteralExpression(expression, targetTypeString, checker);
  } else {
    parentType = checker.getTypeAtLocation(expression);
  }
  return parentType;
}

function findTypeInObjectLiteralExpression(
  expression: ts.ObjectLiteralExpression,
  targetTypeStr: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  for (const prop of expression.properties) {
    const type = checker.getTypeAtLocation((prop as ts.PropertyAssignment).initializer);
    if (isSubtypeOf(targetTypeStr, type, checker)) {
      return type;
    }
  }
  return undefined;
}

function findTargetTypeInParentType(
  targetTypeString: string,
  parentType: ts.Type,
  checker: ts.TypeChecker
): ts.Type | undefined {
  let targetType: ts.Type | undefined;

  if (parentType.symbol) {
    const parentTypeDeclaration = getTypeDeclarationFromTypeSymbol(parentType);
    const targetTypeNode =
      parentTypeDeclaration && findNodeByText(parentTypeDeclaration, targetTypeString);
    targetType = targetTypeNode && checker.getTypeAtLocation(targetTypeNode);
  } else {
    targetType = findTypeInCompositeType(parentType, targetTypeString, checker);
  }
  return targetType;
}

function findTypeInCompositeType(
  type: ts.Type,
  subTypeString: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  if (!isSubtypeOf(subTypeString, type, checker)) {
    return undefined;
  }
  if (type.isUnionOrIntersection()) {
    for (const t of type.types) {
      if (isTypeMatched(subTypeString, t)) {
        return t;
      } else if (isSubtypeOf(subTypeString, t, checker)) {
        return findTypeInCompositeType(t, subTypeString, checker);
      }
    }
  } else {
    const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
    if (typeArguments.length > 0) {
      for (const t of typeArguments) {
        if (isTypeMatched(subTypeString, t)) {
          return t;
        } else if (isSubtypeOf(subTypeString, t, checker)) {
          return findTypeInCompositeType(t, subTypeString, checker);
        }
      }
    }

    const aliasTypeArguments = type.aliasTypeArguments;
    if (aliasTypeArguments && aliasTypeArguments.length > 0) {
      for (const t of aliasTypeArguments) {
        if (isTypeMatched(subTypeString, t)) {
          return t;
        } else if (isSubtypeOf(subTypeString, t, checker)) {
          return findTypeInCompositeType(t, subTypeString, checker);
        }
      }
    }
  }
  return undefined;
}
