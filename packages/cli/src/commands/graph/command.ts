import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { graphOrderTask } from './tasks/graphOrderTask.js';
import type { CommandContext, GraphCommandOptions } from '../../types.js';

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description(
    `Produces the migration order of 'dependencies' and file order. By default ignores 'devDependencies'.`
  )
  .argument('[srcDir]', 'Path to directory containing a package.json', process.cwd())
  .option('--devDeps', `Follow packages in 'devDependencies'`)
  .option('--deps', `Follow packages in 'dependencies'`)
  .option(
    '--ignore [packagesOrGlobs...]',
    `A space deliminated list of packages or globs to ignore`,
    []
  )
  .addOption(
    new Option('--rootPath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option('-o, --output <filepath>', 'Output path for a JSON format of the graph order')
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
