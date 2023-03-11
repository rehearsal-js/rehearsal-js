import { resolve } from 'node:path';
import { Logger } from 'winston';
import debug from 'debug';
import chalk from 'chalk';
import { execa } from 'execa';
import {
  determineProjectName,
  openInEditor,
  getPathToBinary,
  prettyGitDiff,
} from '@rehearsal/utils';

import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:migrate:convert');

export function convertTask(
  options: MigrateCommandOptions,
  logger: Logger,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: 'Convert JS files to TS',
    enabled: (): boolean => !options.dryRun,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // Because we have to eagerly import all the tasks we need tolazily load these
      // modules because they refer to typescript which may or may not be installed
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getReportSummary } = await import('../../../helpers/report.js');
      // If context is provide via external parameter, merge with existed
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

      if (ctx.sourceFilesWithAbsolutePath) {
        if (!options.ci) {
          // In interactive mode, go through files one by one
          // and ask user for actions: Accept/Edit/Discard
          for (const f of ctx.sourceFilesWithAbsolutePath) {
            const jsFilePath = f;
            const tsFilePath = f.replace(/js$/g, 'ts');
            let completed = false;

            const input = {
              basePath: ctx.targetPackagePath,
              entrypoint,
              sourceFiles: [f],
              logger: logger,
              reporter,
              task,
            };

            const { migratedFiles } = await migrate(input);

            // show git diff in a git repo
            let diffOutput: string = '';
            try {
              diffOutput = (await execa('git', ['diff', tsFilePath])).stdout;
            } catch (e) {
              // no-ops
            }

            const message = `${chalk.yellow(
              `Please view the migration changes for ${f} and select an option to continue:`
            )}\n${prettyGitDiff(diffOutput)}`;

            while (!completed) {
              ctx.input = await task.prompt([
                {
                  type: 'Select',
                  name: 'fileActionSelection',
                  message,
                  choices: ['Accept', 'Edit', 'Discard'],
                },
              ]);

              if (ctx.input === 'Accept') {
                completed = true;
              } else if (ctx.input === 'Edit') {
                if (!process.env['EDITOR']) {
                  logger.warn(
                    'Cannot find default editor in environment variables, please set $EDITOR and try again.'
                  );
                  continue;
                } else {
                  await openInEditor(tsFilePath);
                  completed = true;
                }
              } else {
                // discard
                try {
                  await execa('git', ['restore', tsFilePath], { cwd: ctx.targetPackagePath });
                  await execa('git', ['mv', tsFilePath, jsFilePath], {
                    cwd: ctx.targetPackagePath,
                  });
                } catch (e) {
                  // do nothing if does not have git
                }

                completed = true;
              }
            }
            const reportOutputPath = resolve(basePath, options.outputPath);
            generateReports('migrate', reporter, reportOutputPath, options.format);
            task.title = getReportSummary(reporter.report, migratedFiles.length);
          }
          if (ctx.state) {
            ctx.state.addFilesToPackage(ctx.targetPackagePath, ctx.sourceFilesWithAbsolutePath);
          }
        } else {
          const input = {
            basePath: ctx.targetPackagePath,
            entrypoint,
            sourceFiles: ctx.sourceFilesWithAbsolutePath,
            logger: logger,
            reporter,
            task,
          };

          const { migratedFiles } = await migrate(input);

          DEBUG_CALLBACK('migratedFiles', migratedFiles);
          const reportOutputPath = resolve(options.basePath, options.outputPath);
          generateReports('migrate', reporter, reportOutputPath, options.format);
          task.title = getReportSummary(reporter.report, migratedFiles.length);
        }
      } else {
        task.skip('Skip JS -> TS conversion task, no JS files detected');
      }
    },
  };
}
