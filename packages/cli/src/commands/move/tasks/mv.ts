import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { execSync } from 'node:child_process';
import debug from 'debug';
import { ListrTask } from 'listr2';
import { MoveCommandContext, MoveCommandOptions } from '../../../types.js';
import type { ListrTaskWrapper, ListrDefaultRenderer } from 'listr2';

const DEBUG_CALLBACK = debug('rehearsal:cli:moveTask');

type MoveCommandTask = ListrTaskWrapper<MoveCommandContext, ListrDefaultRenderer>;

export function moveTask(
  options: MoveCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: MoveCommandContext
): ListrTask<MoveCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Executing git mv',
    task(ctx: MoveCommandContext, task: MoveCommandTask) {
      const { dryRun, basePath } = options;
      const { jsSourcesAbs } = ctx;

      if (jsSourcesAbs) {
        gitMove(jsSourcesAbs, task, basePath, dryRun);
      } else {
        task.skip('JS files not detected');
      }
    },
  };
}

// rename files to TS extension via git mv only. will throw if the file has not been tracked
export function gitMove(
  sourceFiles: string[],
  listrTask: MoveCommandTask,
  basePath: string,
  dryRun = false
): string[] {
  return sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);

    if (ext === '.hbs') {
      return sourceFile;
    }

    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = ext === '.gjs' ? `${destFile}.gts` : `${destFile}.ts`;
    const dtsFile = `${destFile}.d.ts`;

    if (sourceFile === tsFile) {
      DEBUG_CALLBACK(`no-op ${sourceFile} is a .ts file`);
    } else if (existsSync(tsFile)) {
      DEBUG_CALLBACK(`Found ${tsFile} ???`);
    } else if (existsSync(dtsFile)) {
      DEBUG_CALLBACK(`Found ${dtsFile} ???`);
      // Should prepend d.ts file if it exists to the new ts file.
    } else {
      const destFile = tsFile;
      if (dryRun) {
        execSync(`git mv ${sourceFile} ${tsFile} --dry-run`, { cwd: basePath });
      } else {
        try {
          execSync(`git mv ${sourceFile} ${tsFile}`, { cwd: basePath });
        } catch (error) {
          // use simple mv if git mv fails
          listrTask.output = `git mv failed, using mv`;
          execSync(`mv ${sourceFile} ${tsFile}`);
        }
      }

      listrTask.output = `git mv ${sourceFile.replace(basePath, '')} to ${destFile.replace(
        basePath,
        ''
      )}`;
    }

    return tsFile;
  });
}
