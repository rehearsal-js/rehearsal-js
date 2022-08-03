import ts, { getDefaultFormatCodeSettings } from 'typescript';

import { FixTransform, type FixResult, type FixedFile } from '@rehearsal/shared';
import { getTypeNameFromVariable } from '@rehearsal/utils';
import { findNodeAtPosition, insertIntoText } from '@rehearsal/shared';
import { type RehearsalService }  from '@rehearsal/service';

export default class FixTransform7006 extends FixTransform {
  hint = `TBD Parameter '{0}' implicitly has an '{1}' type.`; // TODO this is not final

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (!node /* || !ts.isIdentifier(errorNode) */) {
      return { fixedFiles: new Array<FixedFile>(), commentedFiles: new Array<FixedFile>()};
    }

    const languageService = service.getLanguageService();
    const variableName = node.getFullText();
    const program = languageService.getProgram()!;
    const typeName = getTypeNameFromVariable(node, program.getTypeChecker());

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
  
    let results: Array<FixedFile> = new Array<FixedFile>();

    fixes.forEach(async (fix) => {
      console.log(fix);
      fix.changes.forEach(({ fileName, textChanges }) => {
        console.log(fileName, textChanges);
        textChanges.forEach((change) => {
          let updatedText = insertIntoText(content, change.span.start, change.newText);
          console.log('CONTENT', updatedText);
          // location is not correct.
          const location = { line: change.span.start, character: change.span.length }
          results.push({ fileName, updatedText, location })

        });
      });
    });

    return { fixedFiles: results, commentedFiles: []} ;
  };
}
