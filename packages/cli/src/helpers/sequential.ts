// eslint-disable-next-line no-restricted-imports -- type import
import type { SourceFile } from '@rehearsal/migration-graph';

export async function getSourceFiles(basePath: string, entrypoint: string): Promise<string[]> {
  const getMigrationStrategy = await import('@rehearsal/migration-graph').then(
    (m) => m.getMigrationStrategy
  );

  const strategy = getMigrationStrategy(basePath, {
    entrypoint,
  });
  const sourceFiles: SourceFile[] = strategy.getMigrationOrder();
  const files = sourceFiles.map((f) => f.path);
  return files;
}
