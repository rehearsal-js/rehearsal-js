#!/usr/bin/env node

// TODO: handle ctrl + c

import { Command } from 'commander';
import winston from 'winston';
import { migrate } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
import fs from 'fs-extra';
import { Listr } from 'listr2';
import { resolve } from 'path';
import toposort from 'toposort';
import { addDevDep, determineProjectName, isYarnManager } from '../utils';
import { cruise, ICruiseResult, ICruiseOptions, IModule, IDependency } from 'dependency-cruiser';
import execa = require('execa');

function ifHasTypescriptInDevdep(root: string): boolean {
  const packageJSONPath = resolve(root, 'package.json');
  const packageJSON = fs.readJSONSync(packageJSONPath);
  return (
    (packageJSON.devDependencies && packageJSON.devDependencies.typescript) ||
    (packageJSON.dependencies && packageJSON.dependencies.typescript)
  );
}

const migrateCommand = new Command();

type migrateCommandOptions = {
  root: string;
  entrypoint: string;
  files: string;
  report_output: string;
  verbose: boolean | undefined;
  clean: boolean | undefined;
};

type Context = {
  skip: boolean;
  sourceFiles: Array<string>;
};

migrateCommand
  .description('Migrate Javascript project to Typescript')
  .requiredOption('-r, --root <project root>', 'Base dir (root) of your project.')
  .requiredOption('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option('-r, --report_output <report output dir>', 'Target directory for the report output')
  .option('-c, --clean', 'Clean up old JS files after TS convertion')
  .option('-v, --verbose', 'Print more logs to debug.')
  .action(async (options: migrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: loggerLevel }),
      ],
    });

    const tasks = new Listr<Context>(
      [
        {
          title: 'Installing dependencies',
          task: async (_, task) => {
            if (ifHasTypescriptInDevdep(options.root)) {
              task.skip('typescript already exists. Skipping installing typescript.');
            } else {
              await addDevDep('typescript');
            }
          },
        },
        {
          title: 'Creating tsconfig.json', // TODO: use a simple one
          task: async (_, task) => {
            const configPath = resolve(options.root, 'tsconfig.json');

            if (fs.existsSync(configPath)) {
              task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
            } else {
              task.title = `No tsconfig.json found, creating ${configPath}.`;
              createTSConfig(options.root);
            }
          },
        },
        {
          title: 'Converting JS files to TS',
          task: async (ctx, task) => {
            const projectName = (await determineProjectName()) || '';
            const reporter = new Reporter(
              projectName,
              options.report_output ? options.report_output : options.root,
              logger
            );
            const sourceFiles: Array<string> = getDependencyOrder(options.entrypoint);
            // store sourceFiles for future clean up task
            ctx.sourceFiles = sourceFiles;
            if (sourceFiles.length) {
              const input = {
                basePath: options.root,
                sourceFiles,
                logger: undefined, // TODO: do we need the logger inside migrate package?
                reporter,
              };

              await migrate(input);
            } else {
              task.skip(
                `Skipping JS -> TS convertion task, since there is no JS file to be converted to TS.`
              );
            }
          },
        },
        {
          title: 'Clean up old JS files', // TODO: flag
          task: async (ctx, task) => {
            if (ctx.sourceFiles.length && options.clean) {
              cleanJSFiles(ctx.sourceFiles);
            } else {
              task.skip(`Skipping clean up task`);
            }
          },
        },
        {
          title: 'Run Typescript compiler to check errors',
          task: async () => {
            const isYarn = await isYarnManager();
            // check if npm or yarn
            const binAndArgs = {
              bin: isYarn ? 'yarn' : 'npm',
              args: ['tsc'],
            };

            await execa(binAndArgs.bin, binAndArgs.args);
            // TODO: what to do with those ts errors?
            // Adding ts-ignore with error details in comment?
          },
        },
      ],
      { concurrent: false, exitOnError: true }
    );
    try {
      await tasks.run();
    } catch (e) {
      logger.error(`${e}`);
    }
  });

migrateCommand.parse(process.argv);

/**
 * Generate tsconfig
 * @param root Project root to run migration
 */
function createTSConfig(root: string): void {
  // TODO: this is from internal node-14 ts-base config
  const config = {
    $schema: 'http://json.schemastore.org/tsconfig',
    compilerOptions: {
      baseUrl: '.',
      outDir: 'dist',
      strict: true,
      noUncheckedIndexedAccess: true,
      module: 'es2020',
      moduleResolution: 'node',
      newLine: 'lf',
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      target: 'es2020',
      lib: ['es2020'],
      esModuleInterop: true,
      declaration: true,
      sourceMap: true,
      declarationMap: true,
    },
    // TODO: add files in include
    include: [],
  };
  fs.writeJsonSync(resolve(root, 'tsconfig.json'), config, { spaces: 2 });
}

/**
 * Remove files
 * @param fileList Array of file paths
 */
function cleanJSFiles(fileList: Array<string>): void {
  fileList.filter((f) => f.match(/\.js$/)).forEach((f) => fs.rmSync(f));
}

function getDependencyOrder(globs: string): Array<string> {
  const cruiseOptions: ICruiseOptions = {
    exclude: {
      path: 'node_modules',
    },
  };
  const entry = globs.split(',');
  const output = cruise(entry, cruiseOptions).output as ICruiseResult;

  const edgeList = createDirectEdgeList(output.modules);
  const coreDependencies = getCoreDependencies(output.modules);

  const dependencyList = toposort(edgeList).reverse(); // leaf frist

  // remove core deps (fs, path, os, etc) from depList
  return dependencyList.filter((d) => {
    return !coreDependencies.includes(d);
  });
}

// prepare array of directional edges for tsort
// [module, dependency]
function createDirectEdgeList(moduleList: IModule[]): Array<[string, string | undefined]> {
  const graph: Array<[string, string | undefined]> = [];

  moduleList.forEach((m: IModule) => {
    if (m.dependencies.length > 0) {
      m.dependencies.forEach((d: IDependency) => {
        graph.push([m.source, d.resolved]);
      });
    }
  });

  return graph;
}

function getCoreDependencies(moduleList: IModule[]): Array<string> {
  const cores: Array<string> = [];
  moduleList.forEach((m: IModule) => {
    if (m.dependencies.length > 0) {
      m.dependencies.forEach((d: IDependency) => {
        if (d.dependencyTypes.includes('core') && !cores.includes(d.resolved)) {
          cores.push(d.resolved);
        }
      });
    }
  });
  return cores;
}
