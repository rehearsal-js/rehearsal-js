import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { migrate, type MigrateInput } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
import type { FixWorkerInput } from '../../../types.js';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  // worker input
  const {
    mode,
    projectRootDir,
    packageDir,
    filesToMigrate,
    reporterOptionsProjectName,
    reporterOptionsProjectRootDir,
    reporterOptionsTSVersion,
    ignore,
    configName,
    format,
  } = JSON.parse(workerData as string) as FixWorkerInput;

  const reporter = new Reporter({
    tsVersion: reporterOptionsTSVersion,
    projectName: reporterOptionsProjectName,
    projectRootDir: reporterOptionsProjectRootDir,
  });

  const task = {
    set output(text: string) {
      parentPort?.postMessage({ type: 'logger', content: text });
    },
  };

  const migrateOptions = {
    mode,
    projectRootDir,
    packageDir,
    filesToMigrate,
    reporter,
    ignore,
    configName,
    task,
  };

  const migratedFiles = await drainMigrate(migrateOptions);

  reporter.printReport(reporterOptionsProjectRootDir, format);

  // worker output
  parentPort?.postMessage({
    type: 'message',
    content: {
      reportItems: reporter.report.items,
      fixedItemCount: reporter.report.fixedItemCount,
      duration: reporter.duration,
    },
  });
  // resolves the promise in the parent thread
  parentPort?.postMessage({ type: 'files', content: migratedFiles });
}

async function drainMigrate(migrateOptions: MigrateInput): Promise<string[]> {
  const migratedFiles: string[] = [];

  for await (const tsFile of migrate(migrateOptions)) {
    migratedFiles.push(tsFile);
  }

  return migratedFiles;
}
