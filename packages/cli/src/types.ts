// eslint-disable-next-line no-restricted-imports -- type import
import type { MigrationStrategy } from '@rehearsal/migration-graph';
import type { State } from './helpers/state.js';
import type { Logger } from 'winston';
import type { ListrTask } from 'listr2';

export type CliCommand = 'move' | 'graph' | 'fix';
export type Formats = 'sarif' | 'json' | 'sonarqube' | 'md';

export type MoveTasks = {
  initTask: (src: string, options: MoveCommandOptions) => ListrTask;
  moveTask: (src: string, options: MoveCommandOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type FixTasks = {
  initTask: (options: MoveCommandOptions) => ListrTask;
  moveTask: (options: MoveCommandOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type PackageEntry = { name: string; files: string[] };

export type GraphCommandOptions = {
  rootPath: string;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  output?: string;
};

export type GraphCommandContext = {
  skip?: boolean;
  source?: string;
  packageEntry?: string;
  jsSourcesAbs?: string[];
  package?: string;
};

export type GraphTaskOptions = {
  rootPath: string;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  output?: string;
};

export type GraphTasks = {
  graphOrderTask: (
    srcDir: string,
    options: GraphTaskOptions,
    ctx?: MoveCommandContext
  ) => ListrTask;
};

export type MoveCommandOptions = {
  rootPath: string;
  graph: boolean;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  dryRun: boolean;
};

export type MoveCommandContext = {
  skip: boolean;
  strategy: MigrationStrategy | undefined;
  input: string;
  targetPackageAbs: string;
  workspaceRoot: string;
  winstonLogger: Logger;
  projectName: string | null;
  jsSourcesAbs?: string[];
  jsSourcesRel?: string[];
  packageAbs?: string;
  packageRel?: string;
  package?: string;
  migrationOrder?: { packages: PackageEntry[] };
};

export type FixCommandOptions = {
  basePath: string;
  entrypoint: string;
  package: string;
  format: Formats[];
  verbose: boolean | undefined;
  ci: boolean | undefined;
  dryRun: boolean;
  regen: boolean | undefined;
};

export type FixCommandContext = {
  skip: boolean;
  strategy: MigrationStrategy;
  sourceFilesWithAbsolutePath: string[];
  sourceFilesWithRelativePath: string[];
  input: unknown;
  targetPackagePath: string;
  state: State;
};

export type PackageSelection = {
  name: string;
  path: string;
};

export type MenuMap = {
  [key: string]: string;
};

export type TSConfig = {
  compilerOptions: {
    strict: boolean;
  };
  include?: string[];
};

export type RunPath = {
  basePath: string;
  entrypoint: string;
};

export type PreviousRuns = {
  paths: RunPath[];
  previousFixedCount: number;
};
