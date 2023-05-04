/* eslint-disable @typescript-eslint/no-unused-vars */
import { resolve } from 'node:path';
import debug from 'debug';
import chalk from 'chalk';
import { execa } from 'execa';
import {
  determineProjectName,
  getPathToBinary,
  openInEditor,
  prettyGitDiff,
} from '@rehearsal/utils';

import type { ListrTask } from 'listr2';
import type { CommandContext, FixCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:convert-task');

export function convertTask(options: FixCommandOptions, _ctx?: CommandContext): ListrTask {
  return {
    title: 'Infer Types',
    enabled: (): boolean => !options.dryRun,
    task: async (ctx: CommandContext, task): Promise<void> => {
      // Because we have to eagerly import all the tasks we need to lazily load these
      // modules because they refer to typescript which may or may not be installed
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { getReportSummary } = await import('../../../helpers/report.js');
      const projectName = determineProjectName() || '';
      const { basePath } = options;
      const tscPath = await getPathToBinary('tsc', { cwd: basePath });
      let tsVersion = '';

      // If there is no access to tsc binary throw
      try {
        const { stdout } = await execa(tscPath, ['--version']);
        tsVersion = stdout.split(' ')[1];
      } catch (e) {
        throw new Error(`Cannot find or access tsc in ${tscPath}`);
      }

      const reporter = new Reporter({
        tsVersion,
        projectName,
        basePath,
        commandName: '@rehearsal/fix',
      });

      DEBUG_CALLBACK(`ctx: ${JSON.stringify(ctx, null, 2)}`);

      // this just cares about ts files which are already in the proper migration order
      if (ctx.sourceFilesAbs) {
        const input = {
          basePath,
          sourceFilesAbs: ctx.sourceFilesAbs,
          reporter,
          task,
        };

        const migratedFiles = [];

        for await (const tsFile of migrate(input)) {
          if (options.wizard) {
            // In interactive mode, yield each file
            // and ask user for actions: Accept/Edit/Discard
            let completed = false;

            // show git diff in a git repo
            let diffOutput: string = '';
            try {
              diffOutput = (await execa('git', ['diff', tsFile])).stdout;
            } catch (e) {
              // no-ops
            }

            const message = `${chalk.green(
              `Please view the migration changes for ${tsFile}:`
            )}\n${prettyGitDiff(diffOutput)}`;

            task.output = message;

            while (!completed) {
              ctx.input = await task.prompt([
                {
                  type: 'Select',
                  name: 'fileActionSelection',
                  message: 'Select an option to continue:',
                  choices: ['Accept', 'Edit', 'Discard'],
                },
              ]);

              if (ctx.input === 'Accept') {
                migratedFiles.push(tsFile);
                completed = true;
              } else if (ctx.input === 'Edit') {
                if (!process.env['EDITOR']) {
                  throw new Error(
                    '$EDITOR is required for "wizard" mode. Rehearsal cannot find default editor in environment variables, please set $EDITOR and try again.'
                  );
                } else {
                  await openInEditor(tsFile);
                  migratedFiles.push(tsFile);
                  completed = true;
                }
              } else {
                completed = true;
              }
            }
            if (ctx.state) {
              ctx.state.addFilesToPackage(ctx.childPackageAbs, ctx.sourceFilesAbs);
            }
          } else {
            // Only track migrated files and let the generator complete
            migratedFiles.push(tsFile);
          }
        }
        if (ctx.state) {
          ctx.state.addFilesToPackage(ctx.childPackageAbs, ctx.sourceFilesAbs);
        }
        DEBUG_CALLBACK('migratedFiles', migratedFiles);

        reporter.printReport(basePath, options.format);
        task.title = getReportSummary(reporter.report, migratedFiles.length);
      } else {
        const message = options.childPackage
          ? `TypeScript files not found in child package: ${options.childPackage}`
          : `TypeScript files not found in source: ${resolve(basePath, options.source as string)}`;

        task.skip(`${message}`);
      }
    },
  };
}
