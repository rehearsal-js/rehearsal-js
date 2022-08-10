import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';
import { getTypeNameFromVariable } from '@rehearsal/utils';

import { FixTransform } from '../interfaces/fix-transform';
import { DataAggregator, FixResult } from '@rehearsal/reporter';
// import { getInitialResult, addCommentDataToResult } from '../helpers/transform-utils';
import { findNodeAtPosition } from '../helpers/typescript-ast';

export class FixTransform2345 extends FixTransform {
  hint = `Argument of type '{0}' is not assignable to parameter of type '{1}'.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    this.dataAggregator = DataAggregator.getInstance(diagnostic)
    // let result = getInitialResult(diagnostic);

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !ts.isIdentifier(errorNode)) {
      return this.dataAggregator.getResult();
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

    this.dataAggregator.addCommentDataToResult(diagnostic.file.fileName, this.hint, ['modified'], this.dataAggregator.getLocation(diagnostic.file, diagnostic.start));

    return this.dataAggregator.getResult();
  };
}
