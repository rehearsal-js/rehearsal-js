import type { PackageJson, TsConfigJson } from 'type-fest';
// eslint-disable-next-line no-restricted-imports -- type import
import type { Formatters } from '@rehearsal/reporter';
// eslint-disable-next-line no-restricted-imports -- type import
import type { MigrationStrategy } from '@rehearsal/migration-graph';
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
  eslint: string;
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

/*
  ALL COMMANDS
*/

export type CommandContext = {
  skip?: boolean;
  childPackage?: string;
  sourceFilesAbs: string[];
  sourceFilesRel: string[];
  input?: string;
  packageJSON?: PackageJson;
  projectType?: ProjectType;
  strategy?: MigrationStrategy;
  targetPackageAbs?: string;
  workspaceRoot?: string;
  projectName: string;
  packageAbs: string;
  packageRel: string;
  migrationOrder?: { packages: PackageEntry[] };
  source?: string;
  packageEntry?: string;
  package?: string;
};

/*
  MOVE
*/
export type MoveTasks = {
  initTask: (src: string, options: MoveCommandOptions) => ListrTask;
  moveTask: (src: string, options: MoveCommandOptions, ctx?: CommandContext) => ListrTask;
};

export type MoveCommandOptions = {
  rootPath: string;
  graph: boolean;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  dryRun: boolean;
};

/*
  FIX
*/
export type FixTasks = {
  initTask: (src: string, options: FixCommandOptions, ctx?: CommandContext) => ListrTask;
  convertTask: (options: FixCommandOptions, ctx?: CommandContext) => ListrTask;
};

export type FixCommandOptions = {
  format: Formatters[];
  graph: boolean;
  dryRun: boolean;
  rootPath: string;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  skipChecks: boolean;
};

/*
  GRAPH
*/
export type GraphCommandOptions = {
  rootPath: string;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  output?: string;
};

export type GraphTaskOptions = {
  rootPath: string;
  devDeps: boolean;
  deps: boolean;
  ignore: string[];
  output?: string;
};

export type GraphTasks = {
  graphOrderTask: (srcDir: string, options: GraphTaskOptions, ctx?: CommandContext) => ListrTask;
};
