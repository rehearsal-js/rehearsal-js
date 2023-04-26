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

export type PreReqs = {
  node: string;
  eslint: {
    parser: string;
  };
  tsconfig: TSConfig;
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

/*
  MOVE
*/
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

/*
  FIX
*/
export type FixTasks = {
  initTask: (options: FixCommandOptions, ctx?: FixCommandContext) => ListrTask;
  convertTask: (options: FixCommandOptions, ctx?: FixCommandContext) => ListrTask;
};

export type FixCommandOptions = {
  format: Formatters[];
  childPackage?: string;
  source?: string;
  dryRun: boolean;
  basePath: string;
  wizard: boolean;
};

export type FixCommandContext = {
  skip: boolean;
  strategy: MigrationStrategy;
  tsSourcesAbs?: string[];
  tsSourcesRel?: string[];
  input: unknown;
  state: State;
  childPackageAbs: string;
  childPackageRel: string;
  isInteractive: boolean;
  projectType: ProjectType;
  packageJSON: PackageJson;
};

/*
  GRAPH
*/
export type GraphTasks = {
  graphOrderTask: (options: GraphTaskOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type GraphCommandOptions = {
  output?: string;
};

export type GraphCommandContext = {
  skip?: boolean;
  source?: string;
  packageEntry?: string;
  jsSourcesAbs?: string[];
  childPackage?: string;
};

export type GraphTaskOptions = {
  basePath: string;
  output?: string;
};
