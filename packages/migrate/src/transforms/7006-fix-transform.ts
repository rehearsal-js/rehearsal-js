import ts, { getDefaultFormatCodeSettings } from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import { getTypeNameFromVariable } from '../helpers/transform-utils';
import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import type RehearsalService from '../rehearsal-service';

export default class FixTransform7006 extends FixTransform {
  hint = `TBD Parameter '{0}' implicitly has an '{1}' type.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (!node /* || !ts.isIdentifier(errorNode) */) {
      return [];
    }

    const languageService = service.getLanguageService();
    const variableName = node.getFullText();
    const program = languageService.getProgram()!;
    const typeName = getTypeNameFromVariable(node, program);

    console.log(variableName, typeName);

    const sourceFile = diagnostic.file;

    const fixes = languageService.getCodeFixesAtPosition(
      sourceFile.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [7006],
      getDefaultFormatCodeSettings(),
      {}
    );
    const content = sourceFile.getFullText();
    let updatedText = '';
    console.log(fixes);
    fixes.forEach(async (fix) => {
      console.log(fix);
      fix.changes.forEach(({ fileName, textChanges }) => {
        console.log(fileName, textChanges);

        textChanges.forEach((change) => {
          updatedText = insertIntoText(content, change.span.start, change.newText);
          console.log('CONTENT', updatedText);
        });
      });
    });

    if (updatedText) {
      return [
        {
          fileName: sourceFile.fileName,
          text: updatedText,
        },
      ];
    }

    // if (typeName === 'any') {
    //   this.hint =
    //     this.hint +
    //     ` Consider specifying type of argument to be '{1}', using type assertion: '(${variableName} as {1})', or using type guard: 'if (${variableName} instanceof {1}) { ... }'.`;
    // } else {
    //   this.hint =
    //     this.hint +
    //     ` Consider verifying both types, using type assertion: '(${variableName} as string)', or using type guard: 'if (${variableName} instanceof string) { ... }'.`;
    // }

    // console.log(this.hint);

    return [];
  };
}
