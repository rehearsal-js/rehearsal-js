import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { execSync } from 'node:child_process';
import debug from 'debug';
import { ListrTask } from 'listr2';
import type { CommandContext, MoveCommandOptions } from '../../../types.js';
import type { ListrTaskWrapper, ListrDefaultRenderer } from 'listr2';

const DEBUG_CALLBACK = debug('rehearsal:cli:moveTask');

type MoveCommandTask = ListrTaskWrapper<CommandContext, ListrDefaultRenderer>;

export function moveTask(
  src: string,
  options: MoveCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: 'Executing git mv',
    task(ctx: CommandContext, task: MoveCommandTask) {
      const { dryRun } = options;
      const { sourceFilesAbs } = ctx;

      DEBUG_CALLBACK(`sourceFilesAbs: ${sourceFilesAbs}`);

      if (sourceFilesAbs) {
        task.output = gitMove(sourceFilesAbs, task, src, dryRun);
      } else {
        task.skip('JS files not detected');
      }
    },
    options: { persistentOutput: true },
  };
}

// rename files to TS extension via git mv only. will throw if the file has not been tracked
export function gitMove(
  sourceFiles: string[],
  listrTask: MoveCommandTask,
  basePath: string,
  dryRun = false
): string {
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

      listrOutput += `${sourceFile.replace(basePath, '')} -> ${destFile.replace(basePath, '')}\n`;
    }
  });

  return listrOutput;
}
