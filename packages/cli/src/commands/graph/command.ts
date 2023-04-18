import { Command } from 'commander';
// eslint-disable-next-line no-restricted-imports
import { Listr } from 'listr2';
import { graphOrderTask } from './tasks/graphOrderTask.js';

interface GraphCommandOptions {
  output?: string;
}

export const graphCommand = new Command();

graphCommand
  .name('graph')
  .description('Produces the order of packages or files should be migrated')
  .argument('[basePath]', 'Path to directory contains tsconfig.json', process.cwd())
  .option('-o, --output <filepath>', 'Output path for a JSON format of the graph order')
  .action(async (basePath: string, options: GraphCommandOptions) => {
    await new Listr([graphOrderTask(basePath, options.output)]).run();
  });
