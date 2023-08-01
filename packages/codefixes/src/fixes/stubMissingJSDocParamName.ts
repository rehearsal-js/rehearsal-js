import { createHash } from 'crypto';
import ts, { CodeFixAction } from 'typescript';
import { ChangesFactory } from '@rehearsal/ts-utils';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';

function createUniqueIdentifier(data: string): string {
  const hash = createHash('md5').update(data).digest('hex');
  return hash.substring(0, 6);
}

export class StubMissingJSDocParamName implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS8024.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const originalStart = diagnostic.start;
    const originalEnd = originalStart + diagnostic.length;
    const content = diagnostic.file.getFullText(diagnostic.file);

    if (originalStart !== originalEnd) {
      return;
    }

    const uniqueIdentifier = createUniqueIdentifier(`${content}-${originalStart}-${originalEnd}`);

    const changes: [ts.FileTextChanges] = [
      // Augment the SuperClass signature first as it's lower in the file
      ChangesFactory.insertText(
        diagnostic.file,
        originalStart,
        `unnamedParam_${uniqueIdentifier} `
      ),
    ];

    return createCodeFixAction(
      'stubMissingNameJSDocParam',
      changes,
      'adds a unique name to the unamed JSDoc @param'
    );
  }
}
