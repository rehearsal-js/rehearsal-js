import { resolve } from 'path';
import type { SourceFile, TypeChecker } from 'typescript';

import { testService } from './test-service';

interface SetupResult {
  sourceFile: SourceFile | undefined;
  checker: TypeChecker;
}

export function setupTest(testFileName: string): SetupResult {
  const partialFilename = testFileName.split('/').pop()?.replace('.test', '');
  const filePath = resolve(testService.getBasePath(), 'fixtures', 'tsc-utils', partialFilename!);
  const sourceFile = testService.getSourceFile(filePath);
  const checker = testService.getTypeChecker();
  return {
    sourceFile,
    checker,
  };
}
