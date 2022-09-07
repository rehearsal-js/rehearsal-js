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
import { addDevDep, determineProjectName, runYarnOrNpmCommand } from '../utils';
import { cruise, ICruiseResult, ICruiseOptions, IModule, IDependency } from 'dependency-cruiser';

function ifHasTypescriptInDevdep(root: string): boolean {
  const packageJSONPath = resolve(root, 'package.json');
  const packageJSON = fs.readJSONSync(packageJSONPath);
  return (
    (packageJSON.devDependencies && packageJSON.devDependencies.typescript) ||
    (packageJSON.dependencies && packageJSON.dependencies.typescript)
  );
}

export const migrateCommand = new Command('migrate');

type migrateCommandOptions = {
  root: string;
  entrypoint: string;
  files: string;
  report_output: string;
  verbose: boolean | undefined;
  clean: boolean | undefined;
  strict: boolean | undefined;
};

type Context = {
  skip: boolean;
  sourceFiles: Array<string>;
};

type ParsedModuleResult = {
  edgeList: Array<[string, string | undefined]>;
  coreDepList: Array<string>;
};

migrateCommand
  .description('Migrate Javascript project to Typescript')
  .requiredOption('-r, --root <project root>', 'Base dir (root) of your project.')
  .requiredOption('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option('-r, --report_output <report output dir>', 'Target directory for the report output')
  .option('-s, --strict', 'Use strict tsconfig file')
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
          task: async (_ctx, task) => {
            if (ifHasTypescriptInDevdep(options.root)) {
              task.skip('typescript already exists. Skipping installing typescript.');
            } else {
              await addDevDep('typescript', { cwd: options.root });
            }
          },
        },
        {
          title: 'Creating tsconfig.json', // TODO: use a simple one
          task: async (_ctx, task) => {
            const configPath = resolve(options.root, 'tsconfig.json');

            if (fs.existsSync(configPath)) {
              task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
            } else {
              task.title = `Creating ${options.strict ? 'strict' : 'basic'} tsconfig.`;
              const sourceFiles: Array<string> = getDependencyOrder(options.entrypoint);
              createTSConfig(options.root, sourceFiles, !!options.strict);
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
            ctx.sourceFiles = sourceFiles;
            if (sourceFiles) {
              const input = {
                basePath: options.root,
                sourceFiles,
                logger: options.verbose ? logger : undefined,
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
            await runYarnOrNpmCommand(['tsc'], { cwd: options.root });
          },
        },
        // TODO: what to do with those ts errors?
      ],
      { concurrent: false, exitOnError: false }
    );
    try {
      await tasks.run();
    } catch (e) {
      logger.error(`${e}`);
    }
  });

/**
 * Generate tsconfig
 * @param root Project root to run migration
 */
function createTSConfig(root: string, fileList: Array<string>, strict: boolean): void {
  const include = [...fileList.map((f) => f.replace('.js', '.ts'))];
  const config = strict
    ? {
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
        include,
      }
    : {
        $schema: 'http://json.schemastore.org/tsconfig',
        compilerOptions: {
          baseUrl: '.',
          outDir: 'dist',
          emitDeclarationOnly: true,
          allowJs: true,
          target: 'es2016',
          module: 'commonjs',
          moduleResolution: 'node',
        },
        include,
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

// Feed entrypoint to dependency-cruise to get an array or file list with migration order
function getDependencyOrder(entrypoint: string): Array<string> {
  const cruiseOptions: ICruiseOptions = {
    exclude: {
      path: 'node_modules',
    },
  };

  const output = cruise([entrypoint], cruiseOptions).output as ICruiseResult;

  const { edgeList, coreDepList } = parseModuleList(output.modules);

  const dependencyList = toposort(edgeList).reverse(); // leaf frist

  // remove core deps (fs, path, os, etc) from depList
  return dependencyList.filter((d) => {
    return !coreDepList.includes(d);
  });
}

// Process IModule[] from dependency-cruise to create
// 1. directional edges (graph) -> [module, dependency]
// 2. List of core deps which should be exclude in migration files
function parseModuleList(moduleList: IModule[]): ParsedModuleResult {
  const edgeList: Array<[string, string | undefined]> = [];
  const coreDepList: Array<string> = [];

  moduleList.forEach((m: IModule) => {
    if (m.dependencies.length > 0) {
      m.dependencies.forEach((d: IDependency) => {
        if (d.dependencyTypes.includes('core') && !coreDepList.includes(d.resolved)) {
          coreDepList.push(d.resolved);
        }
        edgeList.push([m.source, d.resolved]);
      });
    }
  });
  return { edgeList, coreDepList };
}
