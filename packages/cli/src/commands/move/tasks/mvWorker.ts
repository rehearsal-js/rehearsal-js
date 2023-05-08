import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { extname } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  const { sourceFiles, basePath, dryRun } = JSON.parse(workerData as string) as {
    sourceFiles: string[];
    basePath: string;
    dryRun: boolean;
  };

  parentPort?.postMessage(gitMove(sourceFiles, basePath, dryRun));
}

export function gitMove(sourceFiles: string[], basePath: string, dryRun = false): string {
  let listrOutput = 'renamed: \n';

  sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);

    if (ext === '.hbs') {
      return sourceFile;
    }

    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = ext === '.gjs' ? `${destFile}.gts` : `${destFile}.ts`;
    const dtsFile = `${destFile}.d.ts`;

    if (sourceFile === tsFile) {
      // noop
    } else if (existsSync(tsFile)) {
      // noop
    } else if (existsSync(dtsFile)) {
      // noop
    } else {
      const destFile = tsFile;

      if (dryRun) {
        execSync(`git mv ${sourceFile} ${tsFile} --dry-run`, { cwd: basePath });
      } else {
        try {
          execSync(`git mv ${sourceFile} ${tsFile}`, { cwd: basePath });
        } catch (error) {
          // use simple mv if git mv fails
          listrOutput = `git mv failed, using mv\n${listrOutput}`;

          execSync(`mv ${sourceFile} ${tsFile}`);
        }
      }

      listrOutput += `${sourceFile.replace(basePath, '.')} -> ${destFile.replace(basePath, '.')}\n`;
    }
  });

  return listrOutput;
}
