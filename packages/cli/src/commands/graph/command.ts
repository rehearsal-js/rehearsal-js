import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { graphOrderTask } from './tasks/graphOrderTask.js';
import type { GraphCommandContext, GraphCommandOptions } from '../../types.js';

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description(
    `Produces the migration order of 'dependencies' and file order. By default ignores 'devDependencies'.`
  )
  .argument('[srcDir]', 'Path to directory contains a package.json', process.cwd())
  .option('--devDeps', `Follow packages in 'devDependencies'`)
  .option('--deps', `Follow packages in 'dependencies'`)
  .option('--ignore', `A comma deliminated list of packages to ignore`, '')
  .addOption(
    new Option('-b, --basePath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option('-o, --output <filepath>', 'Output path for a JSON format of the graph order')
  .action(async (srcDir: string, options: GraphCommandOptions) => {
    await new Listr<GraphCommandContext>([
      graphOrderTask({
        srcDir: srcDir,
        output: options.output,
        basePath: options.basePath,
        devDeps: options.devDeps,
        deps: options.deps,
      }),
    ]).run();
  });
