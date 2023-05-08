import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { parseCommaSeparatedList } from '@rehearsal/utils';
import { graphOrderTask } from './tasks/graphOrderTask.js';
import type { CommandContext, GraphCommandOptions } from '../../types.js';

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description(`produces the migration order of files given a source path`)
  .argument('[srcPath]', 'path to a directory or file', process.cwd())
  .option(
    '--ignore [globs...]',
    `comma-delimited list of globs to ignore eg. '--ignore tests/**/*,types/**/*'`,
    parseCommaSeparatedList,
    []
  )
  .addOption(
    new Option('--rootPath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option('-o, --output <filepath>', 'output path for a JSON format of the graph order')
  .action(async (srcPath: string, options: GraphCommandOptions) => {
    await new Listr<CommandContext>([
      graphOrderTask(srcPath, {
        output: options.output,
        rootPath: options.rootPath,
        ignore: options.ignore,
      }),
    ]).run();
  });
