import ts from 'typescript';

import { FixTransform, type FixResult, type FixedFile } from '@rehearsal/plugins';
import { type RehearsalService } from '@rehearsal/service';
import { findNodeAtPosition, insertIntoText } from '@rehearsal/utils';

export class FixTransform7006 extends FixTransform {
  hint = `TBD Parameter '{0}' implicitly has an '{1}' type.`; // TODO: this is not final

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (!node /* || !ts.isIdentifier(errorNode) */) { // TODO: Does this need to be uncommented?
      return { fixedFiles: new Array<FixedFile>(), commentedFiles: new Array<FixedFile>() };
    }

    const languageService = service.getLanguageService();
    const formatOptions = ts.getDefaultFormatCodeSettings();
    const sourceFile = diagnostic.file;

    const fileName = sourceFile.fileName;

    const results: Array<FixedFile> = new Array<FixedFile>();

    const fixes = languageService.getCodeFixesAtPosition(
      sourceFile.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [7006],
      formatOptions,
      {}
    );

    const stubLocation = { line: 0, character: 0 }; // TODO: actually get the correct coordinates for this.

    fixes.forEach((fix) => {
      if (fix.fixId) {
        // Why do we need a combined change?
        const combined = languageService.getCombinedCodeFix(
          { type: 'file', fileName },
          fix.fixId,
          formatOptions,
          {}
        );
        const allChanges = combined.changes[0].textChanges; // TODO: Find a use case where this is more than one.

        // Dedupe changes
        // In some cases we may have duplicate changes.
        // Also ...
        // If we revese the order of textChanges we don't have to worry about an
        // augmented position. `reduceRight` will build a new array of changes by pushing
        // elements on to the end.
        const textChanges = allChanges.reduceRight((accumulator, currentValue) => {
          const hasCurrentValue = accumulator.find((c) => {
            return (
              currentValue.span.start == c.span.start &&
              currentValue.span.length == c.span.length &&
              currentValue.newText == c.newText
            );
          });

          if (!hasCurrentValue) {
            accumulator.push(currentValue);
          }

          return accumulator;
        }, new Array<ts.TextChange>());

        let content = service.getFileText(fileName); // Initializes our file content

        textChanges.forEach((change) => {
          // Update our content with the change
          content = insertIntoText(content, change.span.start, change.newText);
        });

        results.push({ fileName, updatedText: content, location: stubLocation });
      }
      else {
        // Otherwise, we don't have a combined fix, let's just try and apply all text changes in reverse order.
        fix.changes.forEach(({ fileName, textChanges }) => {
          const content = sourceFile.getFullText();
          const changes = Array.from(textChanges).reverse();
          changes.forEach((change) => {
            let updatedText = insertIntoText(content, change.span.start, change.newText);
            results.push({ fileName, updatedText, location: stubLocation });
          });
        });
      }
    });

    return { fixedFiles: results, commentedFiles: [] };
  };
}
