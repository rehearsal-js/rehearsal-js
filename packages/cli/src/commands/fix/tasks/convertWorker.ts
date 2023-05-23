import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { migrate, type MigrateInput } from '@rehearsal/migrate';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  // worker input
  const { mode, projectRootDir, packageDir, filesToMigrate, reporter, ignore, configName } =
    JSON.parse(workerData as string) as MigrateInput;

  const migratedFiles: string[] = [];

  parentPort?.postMessage({ type: 'message', content: `processing files` });

  for await (const tsFile of migrate({
    mode,
    projectRootDir,
    packageDir,
    filesToMigrate,
    reporter,
    ignore,
    configName,
  })) {
    migratedFiles.push(tsFile);
  }

  parentPort?.postMessage({ type: 'message', content: `processing complete` });

  // worker output
  parentPort?.postMessage({ type: 'files', content: migratedFiles });
}
