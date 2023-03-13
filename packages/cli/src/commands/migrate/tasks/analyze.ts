import { resolve } from 'path';
import { existsSync } from 'node:fs';
import {
  discoverEmberPackages,
  getMigrationStrategy,
  SourceFile,
} from '@rehearsal/migration-graph';
import { determineProjectName } from '@rehearsal/utils';
import debug from 'debug';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import { minimatch } from 'minimatch';
import { State } from '../../../helpers/state.js';
import {
  MenuMap,
  MigrateCommandContext,
  MigrateCommandOptions,
  PackageSelection,
} from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:migrate:analyze');

const IN_PROGRESS_MARK = '🚧';
const COMPLETION_MARK = '✅';

export function analyzeTask(
  options: MigrateCommandOptions
): ListrTask<MigrateCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing Project',
    async task(ctx: MigrateCommandContext, task) {
      const projectName = determineProjectName(options.basePath);
      const packages = discoverEmberPackages(options.basePath);

      if (!options.ci) {
        const state = new State(
          projectName,
          options.basePath,
          packages.map((p) => p.path) // use relative path
        );

        ctx.state = state;

        const packageSelections: PackageSelection[] = packages.map((p) => {
          return {
            name: p.packageName,
            path: p.path,
          };
        });

        // Get the menu text for each package during interactive mode to show:
        // 1. package has not started any migration before -> no progress found
        // 2. package had a migration with remaining JS files -> x/x migrated, x rehearsal todos
        // 3. package had a full migration with rehearsal todos -> all migrated, x rehearsal todos
        // 4. fully migrated with no JS and rehearsal todo -> do not show the option
        const menuList = packageSelections.map((p) => {
          const { migratedFileCount, totalFileCount, isCompleted } =
            ctx.state.getPackageMigrateProgress(
              p.path // pacakge fullpath is the key of the packageMap in state
            );
          const errorCount = ctx.state.getPackageErrorCount(p.path);
          // default text to show per package
          let progressText = `no progress found`;
          let icon = '';
          let isOptionDisabled = false;
          if (totalFileCount !== 0) {
            // has previous migratoin
            progressText = `${migratedFileCount} of ${totalFileCount} files migrated, ${errorCount} @ts-expect-error(s) need to be fixed`;
            icon = IN_PROGRESS_MARK;

            if (isCompleted && errorCount === 0) {
              icon = COMPLETION_MARK;
              progressText = `Fully migrated`;
              isOptionDisabled = true;
            }
          }
          return {
            name: `${p.name}(${progressText})${icon}`,
            message: `${p.name}(${progressText})${icon}`,
            value: p.path,
            disabled: isOptionDisabled,
          };
        });

        // use a map (option display name -> package location pair) to solve an enquirer bug
        // https://github.com/enquirer/enquirer/issues/121
        const menuMap = menuList.reduce((map, current) => {
          map[current.name] = current.value;
          return map;
        }, {} as MenuMap);

        ctx.input = await task.prompt([
          {
            type: 'Select',
            name: 'packageSelection',
            message: 'We have found multiple packages in your project, select the one to migrate:',
            choices: menuList,
          },
        ]);
        // update basePath based on the selection
        ctx.targetPackagePath = menuMap[ctx.input as string];
        task.output = `Running migration on ${ctx.targetPackagePath}`;
      } else {
        ctx.targetPackagePath = options.basePath;
        task.output = `Running migration on ${projectName}`;
      }

      // construct migration strategy and prepare all the files needs to be migrated
      const strategy = getMigrationStrategy(ctx.targetPackagePath, {
        entrypoint: options.entrypoint,
        exclude: ctx.userConfig?.exclude,
        include: ctx.userConfig?.include,
      });

      const files: SourceFile[] = strategy.getMigrationOrder();
      DEBUG_CALLBACK(
        'migrationOrder',
        files.map((file) => file.relativePath)
      );

      ctx.strategy = strategy;
      ctx.sourceFilesWithAbsolutePath = files.map((f) => f.path);
      ctx.sourceFilesWithRelativePath = files.map((f) => f.relativePath);

      if (options.dryRun) {
        // Skip the rest of tasks
        task.output = `List of files will be attempted to migrate:\n ${ctx.sourceFilesWithRelativePath.join(
          '\n'
        )}`;
      } else {
        // add files to "include" in tsconfig.json
        addFilesToIncludes(
          ctx.sourceFilesWithRelativePath.map((f) => f.replace(/js$/g, 'ts')),
          resolve(options.basePath, 'tsconfig.json')
        );
      }
    },
    options: {
      // options for dryRun, since we need to keep the output to see the list of files
      bottomBar: options.dryRun ? true : false,
      persistentOutput: options.dryRun ? true : false,
    },
  };
}

/**
 * Update "include" in tsconfig.json
 * @param fileList array of relative file paths to the root
 * @param configPath tsconfig.json path
 */
export function addFilesToIncludes(fileList: string[], configPath: string): void {
  if (existsSync(configPath)) {
    const tsConfig = readJSONSync(configPath);
    if (!tsConfig.include) {
      tsConfig.include = fileList;
    } else if (Array.isArray(tsConfig.include) && !tsConfig.include.length) {
      tsConfig.include = fileList;
    } else if (Array.isArray(tsConfig.include)) {
      const uniqueFiles = fileList.filter((f) => {
        // if a file from fileList matches any file/glob in "include"
        // will keep it as unique file
        return (
          tsConfig.include.filter((glob: string) => {
            return minimatch(f, glob);
          }).length === 0
        );
      });
      tsConfig.include = [...tsConfig.include, ...uniqueFiles];
    }
    writeJSONSync(configPath, tsConfig, { spaces: 2 });
  }
}