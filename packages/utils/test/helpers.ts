import { resolve } from 'node:path';
import { testService } from './test-service.js';
import type { SourceFile, TypeChecker } from 'typescript';

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
