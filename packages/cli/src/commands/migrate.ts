#!/usr/bin/env node

import { Command } from 'commander';
import winston from 'winston';
// import { migrate, MigrateInput } from '@rehearsal/migrate';
// import { Reporter } from '@rehearsal/reporter';
import fs from 'fs-extra';
import { Listr } from 'listr2';
import { resolve } from 'path';
// import glob from 'glob';
import { addDevDep } from '../utils';
import { cruise, ICruiseResult, ICruiseOptions, IModule, IDependency } from 'dependency-cruiser';

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
  globs: string;
  files: string;
  report_output: string;
  verbose: boolean | undefined;
  clean: boolean | undefined;
};

migrateCommand
  .description('Migrate Javascript project to Typescript')
  .requiredOption('-r, --root <project root>', 'Base dir (root) of your project.')
  // TODO: do we still need dirs option, since we alteady have globs?
  // .option(
  //   '-d, --dirs <source directory>',
  //   'JS source directories relative to root, separated by comma'
  // )
  .requiredOption(
    '-g, --globs <glob patterns>',
    'glob patterns like src/**/*.js, separated by comma'
  )
  .option('-f, --files <source files>', 'JS source files relative to root, separated by comma')
  .option('-r, --report_output <report output dir>', 'Target directory for the report output')
  .option('-v, --verbose', 'Print more logs to debug.')
  .option('-c, --clean', 'Remove source JS files after migration.')
  .action(async (options: migrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: loggerLevel }),
      ],
    });

    // foo.js,bar.js -> [{root}/foo.js, {root}/bar.js]
    const srcFiles = options.files ? options.files.split(',').map((d) => d.trim()) : [];
    // src/**/*.js,lib/*.js -> ['src/**/*.js', 'lib/*.js']
    const srcGlobs = options.globs ? options.globs.split(',').map((d) => d.trim()) : [];

    // complete absolute file array from --files
    // const srcFileList = srcFiles.map((p) => resolve(options.root, p));

    // get complete file list from array of globs
    // ['src/**/*.js, lib/*.js] -> [{root}/src/foo.js, {root}/src/bar.js, {root}/lib/foo.js]
    // const srcGlobsFileList = (
    //   await Promise.all(
    //     srcGlobs.map(async (g) => {
    //       const list = await getMatchedFileList(resolve(options.root, g));
    //       return list;
    //     })
    //   )
    // ).flat();

    const tasks = new Listr([
      {
        title: 'Installing dependencies',
        skip: (ctx): boolean => ctx.skip,
        task: async (_ctx, task) => {
          if (ifHasTypescriptInDevdep(options.root)) {
            return task.skip('typescript already exists. Skipping installing typescript.');
          }
          await addDevDep('typescript');
        },
      },
      {
        title: 'Creating tsconfig.json',
        skip: (ctx): boolean => ctx.skip,
        task: async (_ctx, task) => {
          const configPath = resolve(options.root, 'tsconfig.json');

          if (fs.existsSync(configPath)) {
            return task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
          } else {
            logger.info(`No tsconfig.json found, creating ${configPath}.`);
            createTSConfig(options.root, srcGlobs, srcFiles);
          }
        },
      },
      {
        title: 'Calculating migration file orders',
        skip: (ctx): boolean => ctx.skip,
        task: async () => {
          try {
            getDependencyOrder(options.globs);
          } catch (error) {
            console.error(error);
          }
        },
      },
      // {
      //   title: 'Migrating JS to TS',
      //   skip: (ctx): boolean => ctx.skip,
      //   task: async () => {
      //     const projectName = (await determineProjectName()) || '';
      //     const reporter = new Reporter(
      //       projectName,
      //       options.report_output ? options.report_output : options.root,
      //       logger
      //     );
      //     const sourceFiles: Array<string> = [...srcFileList, ...srcGlobsFileList];
      //     const input: MigrateInput = {
      //       basePath: options.root,
      //       sourceFiles,
      //       logger,
      //       reporter,
      //     };

      //     await migrate(input);
      //   },
      // },
      // {
      //   title: 'Clean up old JS files',
      //   skip: (ctx): boolean => ctx.skip,
      //   task: async (_ctx, task) => {
      //     if (options.clean) {
      //       cleanJSFiles([...srcFileList, ...srcGlobsFileList]);
      //     } else {
      //       task.skip('skipping cleanup old JS files.');
      //     }
      //   },
      // },
    ]);
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
 * @param globs Array of globs for file matching
 * @param files Array of specific files
 */
function createTSConfig(root: string, globs: Array<string>, files: Array<string>): void {
  // TODO: what is the corrent config to use here?
  const config = {
    $schema: 'http://json.schemastore.org/tsconfig',
    compilerOptions: {
      allowSyntheticDefaultImports: true,
      composite: true,
      declaration: true,
      declarationMap: true,
      esModuleInterop: true,
      module: 'commonjs',
      moduleResolution: 'node',
      newLine: 'LF',
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      resolveJsonModule: true,
      sourceMap: true,
      strict: true,
      target: 'es2017',
    },
    // dirs and files come from cli args would be .js
    include: [...globs, ...files].map((f) => f.replace('.js', '.ts')),
  };
  fs.writeJsonSync(resolve(root, 'tsconfig.json'), config, { spaces: 2 });
}

/**
 * Returns an array of matched file path
 * @param pattern glob pattern
 * @returns Promise<Array<string>>
 */
// function getMatchedFileList(pattern: string): Promise<Array<string>> {
//   return new Promise((resolve, reject) => {
//     glob(pattern, (err, files) => {
//       if (err) {
//         reject(err);
//       }
//       resolve(files);
//     });
//   });
// }

// /**
//  * Remove files
//  * @param fileList Array of file paths
//  */
// function cleanJSFiles(fileList: Array<string>): void {
//   fileList.forEach((f) => fs.rmSync(f));
// }

function getDependencyOrder(globs: string): Array<string> {
  // 1. only looking for type: local
  // 2. get all leaf
  // 3.
  const cruiseOptions: ICruiseOptions = {
    // includeOnly: '^(src|bin)/',
    exclude: {
      path: 'node_modules',
    },
  };
  try {
    const entry = globs.split(',');
    console.log(entry);
    const output = cruise(entry, cruiseOptions).output as ICruiseResult;
    // console.log(output);
    const graph = createDependencyGraph(output.modules);
    createEdges(graph);
  } catch (error) {
    console.error(error);
  }

  return [];
}

function createEdges(graph: DependencyGraph): void {
  const keys = Object.keys(graph);
  const used = new Set();
  const result = [];
  let i;
  let item;
  let length;
  do {
    length = keys.length;
    i = 0;
    while (i < keys.length) {
      if (graph[keys[i]].every(Set.prototype.has, used)) {
        item = keys.splice(i, 1)[0];
        result.push(item);
        used.add(item);
        continue;
      }
      i++;
    }
  } while (keys.length && keys.length !== length);

  result.push(...keys);
  console.log(result);
}

interface DependencyGraph {
  [key: string]: IDependency[];
}

function createDependencyGraph(moduleList: IModule[]): DependencyGraph {
  const graph: DependencyGraph = {};
  moduleList.forEach((m) => {
    const { source, dependencies } = m;
    graph[source] = dependencies;
  });
  return graph;
}
