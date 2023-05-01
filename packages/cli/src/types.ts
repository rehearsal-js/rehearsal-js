import type { PackageJson, TsConfigJson } from 'type-fest';
// eslint-disable-next-line no-restricted-imports -- type import
import type { Formatters } from '@rehearsal/reporter';
// eslint-disable-next-line no-restricted-imports -- type import
import type { MigrationStrategy } from '@rehearsal/migration-graph';
import type { State } from './helpers/state.js';
import type { Logger } from 'winston';
import type { ListrTask } from 'listr2';

export type CliCommand = 'move' | 'graph' | 'fix';
export type PackageEntry = { name: string; files: string[] };
export type PackageSelection = {
  name: string;
  path: string;
};

export type ProjectType = 'base' | 'ember' | 'glimmer';
export type TSConfigBase = {
  compilerOptions: {
    strict: boolean;
    skipLibCheck: boolean;
  };
};

export type TSConfigEmber = TSConfigBase & {
  glint: {
    environment: string[];
    checkStandaloneTemplates: boolean;
  };
};

export type TSConfigGlimmer = TSConfigBase & {
  glint: {
    environment: string[];
    checkStandaloneTemplates: boolean;
  };
};

export type PreReqs = {
  node: string;
  eslint: {
    parser: string;
  };
  tsconfig: TSConfigBase | TSConfigEmber | TSConfigGlimmer;
  deps: Record<string, string>;
};

export type MenuMap = {
  [key: string]: string;
};

export interface TSConfig extends TsConfigJson {
  glint?: {
    environment?: string[];
    checkStandaloneTemplates?: boolean;
  };
}

export type PreviousRuns = {
  paths: { basePath: string; entrypoint: string }[];
  previousFixedCount: number;
};

export type CommandContext = {
  skip?: boolean;
  childPackage?: string;
  childPackageAbs: string;
  childPackageRel: string;
  source?: string;
  sourceFilesAbs?: string[];
  sourceFilesRel?: string[];
  input: string;
  packageEntry?: string;
  packageJSON: PackageJson;
  projectName: string | null;
  projectType: ProjectType;
  migrationOrder?: { packages: PackageEntry[] };
  strategy?: MigrationStrategy;
  state: State;
};

/*
  MOVE
*/
export type MoveTasks = {
  initTask: (src: string, options: MoveCommandOptions) => ListrTask;
  moveTask: (src: string, options: MoveCommandOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type FixTasks = {
  initTask: (options: MoveCommandOptions) => ListrTask;
  moveTask: (options: MoveCommandOptions, ctx?: CommandContext) => ListrTask;
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

/*
  FIX
*/
export type FixTasks = {
  initTask: (options: FixCommandOptions, ctx?: CommandContext) => ListrTask;
  convertTask: (options: FixCommandOptions, ctx?: CommandContext) => ListrTask;
};

export type FixCommandOptions = {
  format: Formatters[];
  childPackage?: string;
  source?: string;
  dryRun: boolean;
  basePath: string;
  wizard: boolean;
};

/*
  GRAPH
*/
export type GraphTasks = {
  graphOrderTask: (options: GraphTaskOptions, ctx?: CommandContext) => ListrTask;
};

export type GraphCommandOptions = {
  output?: string;
};

export type GraphTaskOptions = {
  basePath: string;
  output?: string;
};
