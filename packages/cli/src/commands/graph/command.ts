import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { parseCommaSeparatedList } from '@rehearsal/utils';
import { graphOrderTask } from './tasks/graphOrderTask.js';
import type { CommandContext, GraphCommandOptions } from '../../types.js';

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description(
    `produces the migration order of 'dependencies' and file order, default ignores 'devDependencies'.`
  )
  .argument('[srcDir]', 'path to directory containing a package.json', process.cwd())
  .option('--devDeps', `follow packages in 'devDependencies'`)
  .option('--deps', `follow packages in 'dependencies'`)
  .option(
    '--ignore [packagesOrGlobs...]',
    `space deliminated list of packages or globs to ignore`,
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
  .action(async (srcDir: string, options: GraphCommandOptions) => {
    await new Listr<CommandContext>([
      graphOrderTask(srcDir, {
        output: options.output,
        rootPath: options.rootPath,
        devDeps: options.devDeps,
        deps: options.deps,
        ignore: options.ignore,
      }),
    ]).run();
  });
