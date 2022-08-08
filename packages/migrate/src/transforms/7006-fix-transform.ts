import ts from 'typescript';

import { FixTransform, type FixResult, type FixedFile } from '@rehearsal/plugins';
import { type RehearsalService }  from '@rehearsal/service';
import { findNodeAtPosition, insertIntoText } from '@rehearsal/utils';

export default class FixTransform7006 extends FixTransform {
  hint = `TBD Parameter '{0}' implicitly has an '{1}' type.`; // TODO this is not final

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (!node /* || !ts.isIdentifier(errorNode) */) {
      return { fixedFiles: new Array<FixedFile>(), commentedFiles: new Array<FixedFile>()};
    }

    const languageService = service.getLanguageService();    
    const formatOptions = ts.getDefaultFormatCodeSettings();
    const sourceFile = diagnostic.file;
    
    const fileName = sourceFile.fileName;
    
    let results: Array<FixedFile> = new Array<FixedFile>();
    
    const fixes = languageService.getCodeFixesAtPosition(
      sourceFile.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [7006],
      formatOptions,
      {}
    );
    
    fixes.forEach((fix) => {
      if (fix.fixId) {
        // Why do we need a combined change?
        const combined = languageService.getCombinedCodeFix({ type: "file", fileName }, fix.fixId, formatOptions, {});
        const allChanges = combined.changes[0].textChanges;
        
        // Dedupe changes
        // In some cases we may have duplicate changes.
  
        const textChanges = allChanges.reduceRight((accumulator, currentValue ) => {
          const hasCurrentValue = accumulator.find(c => {
            return currentValue.span.start == c.span.start && currentValue.span.length == c.span.length && currentValue.newText == c.newText
          });
  
          if (!hasCurrentValue) {
            accumulator.push(currentValue);
          }
  
          return accumulator;
  
        }, new Array<ts.TextChange>());
        
        // If we revese through the changes we don't have to worry about an augmented position.
        textChanges.forEach((change) => {
          const content = service.getFileText(fileName);
          const updatedText = insertIntoText(content, change.span.start, change.newText);
          service.setFileText(fileName, updatedText)
        });
      }
    });

    const stubLocation = { line: 0, character: 0 };

    results.push({ fileName, updatedText: service.getFileText(fileName), location: stubLocation });

    return { fixedFiles: results, commentedFiles: []} ;
  };
}
