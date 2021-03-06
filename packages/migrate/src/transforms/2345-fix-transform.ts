import ts from 'typescript';

import FixTransform, { type FixedFile } from '../interfaces/fix-transform';
import { findNodeAtPosition } from '../helpers/typescript-ast';
import { getTypeNameFromVariable } from '../helpers/transform-utils';
import type RehearsalService from '../rehearsal-service';

export default class FixTransform2345 extends FixTransform {
  hint = `Argument of type '{0}' is not assignable to parameter of type '{1}'.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !ts.isIdentifier(errorNode)) {
      return [];
    }
    const variableName = errorNode.getFullText();

    const program = service.getLanguageService().getProgram()!;
    const typeName = getTypeNameFromVariable(errorNode, program);

    if (typeName === 'unknown') {
      this.hint =
        this.hint +
        ` Consider specifying type of argument to be '{1}', using type assertion: '(${variableName} as {1})', or using type guard: 'if (${variableName} instanceof {1}) { ... }'.`;
    } else {
      this.hint =
        this.hint +
        ` Consider verifying both types, using type assertion: '(${variableName} as string)', or using type guard: 'if (${variableName} instanceof string) { ... }'.`;
    }

    return [];
  };
}
