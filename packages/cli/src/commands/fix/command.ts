import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { createLogger, format, transports } from 'winston';
import { parseCommaSeparatedList } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
import { FixCommandOptions, FixTasks, GraphTasks } from '../../types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = JSON.parse(
  await fs.readFile(resolve(__dirname, '../../../package.json'), 'utf-8')
) as PackageJson;

const DEBUG_CALLBACK = debug('rehearsal:cli:fix-command');

const winstonLogger = createLogger({
  transports: [new transports.Console({ format: format.cli(), level: 'info' })],
});

export const fixCommand = new Command();

/*
  @rehearsal/fix workflow

  rehearsal fix <path to source file | directory>
    the explicit source file OR explicit directory with implicit child directories fixed.
    migration strategy is ignored

  rehearsal fix <path to child package> --graph
    specify the child-package relative to process.cwd(). migration strategy is leveraged fixing all necessary files in the dependency graph for this package.
    migration strategy is leveraged

  rehearsal fix <path to child package> --graph --devDeps
    same as above but devDependencies are considered in the graph
*/

fixCommand
  .alias('infer')
  .name('fix')
  .description('fixes typescript compiler errors by inferring types on .*ts files')
  .argument('[targetPath]', 'path to file or directory to migrate', process.cwd())
  .option('-g, --graph', 'enable graph resolution of files to move', false)
  .option('--devDeps', `follow packages in 'devDependencies'`, false)
  .option('--deps', `follow packages in 'dependencies'`, false)
  .option(
    '--ignore [packagesOrGlobs...]',
    `space-delimited list of packages or globs to ignore eg. '--ignore tests/**/*,types/**/*'`,
    parseCommaSeparatedList,
    []
  )
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .addOption(
    new Option('--rootDir <project root directory>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .hideHelp()
  )
  .action(async (targetPath: string, options: FixCommandOptions) => {
    await fix(targetPath, options);
  });

async function fix(targetPath: string, options: FixCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/fix ${version?.trim()}`);
  if (options.graph && !options.deps && !options.devDeps) {
    console.warn(
      `Passing --graph without --deps, --devDeps, or both results in only analyzing the local files in the package.`
    );
  }

  if (!options.graph && options.devDeps) {
    throw new Error(`'--devDeps' can only be passed when you pass --graph`);
  }

  if (!options.graph && options.deps) {
    throw new Error(`'--deps' can only be passed when you pass --graph`);
  }

  if (!options.graph && options.ignore.length > 0) {
    throw new Error(`'--ignore' can only be passed when you pass --graph`);
  }

  if (!targetPath) {
    throw new Error(`@rehearsal/fix: you must specify a package or path to move`);
  }

  // grab the child fix tasks
  const { convertTask, initTask } = await loadFixTasks();
  const { graphOrderTask } = await loadGraphTasks();

  // source with a direct filepath ignores the migration graph
  const tasks = options.graph
    ? [
        initTask(targetPath, options),
        graphOrderTask(targetPath, {
          rootPath: options.rootDir,
          devDeps: options.devDeps,
          deps: options.deps,
          ignore: options.ignore,
          skipPrompt: true,
        }),
        convertTask(targetPath, options),
      ]
    : [initTask(targetPath, options), convertTask(targetPath, options)];

  DEBUG_CALLBACK(`tasks: ${JSON.stringify(tasks, null, 2)}`);
  DEBUG_CALLBACK(`options: ${JSON.stringify(options, null, 2)}`);

  try {
    await new Listr(tasks, {
      concurrent: false,
    }).run();
  } catch (e) {
    // listr will log the error we just need to exit
  }
}

async function loadFixTasks(): Promise<FixTasks> {
  return await import('./tasks/index.js').then((m) => {
    const { initTask, convertTask } = m;

    return {
      initTask,
      convertTask,
    };
  });
}

async function loadGraphTasks(): Promise<GraphTasks> {
  return await import('../graph/tasks/graphOrderTask.js').then((m) => {
    const { graphOrderTask } = m;

    return {
      graphOrderTask,
    };
  });
}
