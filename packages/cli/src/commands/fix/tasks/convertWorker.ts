import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { migrate, type MigrateInput } from '@rehearsal/migrate';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  const input = JSON.parse(workerData as string) as MigrateInput;

  const migratedFiles: string[] = [];

  for await (const tsFile of migrate(input)) {
    migratedFiles.push(tsFile);
  }

  parentPort?.postMessage(migratedFiles);
}
