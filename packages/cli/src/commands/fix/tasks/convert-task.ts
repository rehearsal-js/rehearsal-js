import { resolve } from 'node:path';
import { Logger } from 'winston';
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
import type { FixCommandContext, FixCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:convert');

export function convertTask(
  options: FixCommandOptions,
  logger: Logger,
  context?: Partial<FixCommandContext>
): ListrTask {
  return {
    title: 'Convert JS files to TS',
    enabled: (): boolean => !options.dryRun,
    task: async (ctx: FixCommandContext, task): Promise<void> => {
      // Because we have to eagerly import all the tasks we need to lazily load these
      // modules because they refer to typescript which may or may not be installed
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getReportSummary } = await import('../../../helpers/report.js');
      // If context is provided via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }

      const projectName = determineProjectName() || '';
      const { basePath, entrypoint } = options;
      const tscPath = await getPathToBinary('tsc', { cwd: basePath });
      let tsVersion = '';

      // If there is no access to tsc binary, stop
      try {
        const { stdout } = await execa(tscPath, ['--version']);
        tsVersion = stdout.split(' ')[1];
      } catch (e) {
        throw new Error(`Cannot find or access tsc in ${tscPath}`);
      }

      const reporter = new Reporter(
        { tsVersion, projectName, basePath, commandName: '@rehearsal/migrate' },
        logger
      );

      if (ctx.typescriptSourceFiles) {
        const input = {
          basePath: ctx.targetPackagePath,
          entrypoint,
          sourceFiles: ctx.typescriptSourceFiles,
          logger: logger,
          reporter,
          task,
        };

        const migratedFiles = [];

        for await (const tsFile of migrate(input)) {
          // if interactive mode
          if (!options.ci) {
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
                  logger.warn(
                    'Cannot find default editor in environment variables, please set $EDITOR and try again.'
                  );
                  continue;
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
              ctx.state.addFilesToPackage(ctx.targetPackagePath, ctx.sourceFilesWithAbsolutePath);
            }
          } else {
            // Only track migrated files and let the generator complete
            migratedFiles.push(tsFile);
          }
        }
        if (ctx.state) {
          ctx.state.addFilesToPackage(ctx.targetPackagePath, ctx.sourceFilesWithAbsolutePath);
        }
        DEBUG_CALLBACK('migratedFiles', migratedFiles);
        const reportOutputPath = resolve(basePath, options.outputPath);
        generateReports('fix', reporter, reportOutputPath, options.format);
        task.title = getReportSummary(reporter.report, migratedFiles.length);
      } else {
        task.skip('TypeScript not detected');
      }
    },
  };
}
