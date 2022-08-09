import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';
import { findNodeAtPosition, getTypeNameFromVariable } from '@rehearsal/utils';
import { FixTransform, type FixResult, getCommentsOnlyResult } from '@rehearsal/plugins';

export class FixTransform2345 extends FixTransform {
  hint = `Argument of type '{0}' is not assignable to parameter of type '{1}'.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !ts.isIdentifier(errorNode)) {
      return getCommentsOnlyResult(diagnostic);
    }
    const variableName = errorNode.getFullText();

    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();
    const typeName = getTypeNameFromVariable(errorNode, checker);

    if (typeName === 'unknown') {
      this.hint =
        this.hint +
        ` Consider specifying type of argument to be '{1}', using type assertion: '(${variableName} as {1})', or using type guard: 'if (${variableName} instanceof {1}) { ... }'.`;
    } else {
      this.hint =
        this.hint +
        ` Consider verifying both types, using type assertion: '(${variableName} as string)', or using type guard: 'if (${variableName} instanceof string) { ... }'.`;
    }

    return getCommentsOnlyResult(diagnostic);
  };
}
