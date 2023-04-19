import { Command } from 'commander';
import { Listr } from 'listr2';
import { graphOrderTask } from './tasks/graphOrderTask.js';
import type { GraphCommandContext, GraphCommandOptions } from '../../types.js';

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description('Produces the migration order of packages or files')
  .argument('[basePath]', 'Path to directory contains a package.json', process.cwd())
  .option('-o, --output <filepath>', 'Output path for a JSON format of the graph order')
  .action(async (basePath: string, options: GraphCommandOptions) => {
    await new Listr<GraphCommandContext>([
      graphOrderTask({ basePath, output: options.output }),
    ]).run();
  });
