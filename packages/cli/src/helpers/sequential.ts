import { getMigrationStrategy, SourceFile } from '@rehearsal/migration-graph';
// import { type RunPath } from '../types';

export function getSourceFiles(basePath: string, entrypoint: string): string[] {
  const strategy = getMigrationStrategy(basePath, {
    entrypoint,
  });
  const sourceFiles: SourceFile[] = strategy.getMigrationOrder();
  const files = sourceFiles.map((f) => f.path);
  return files;
}
