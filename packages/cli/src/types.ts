// eslint-disable-next-line no-restricted-imports -- type import
import type { MigrationStrategy } from '@rehearsal/migration-graph';
import type { UserConfig } from './user-config.js';
import type { State } from './helpers/state.js';
import type { Logger } from 'winston';
import type { ListrTask } from 'listr2';

export type CliCommand = 'move' | 'migrate';
export type Formats = 'sarif' | 'json' | 'sonarqube' | 'md';

export * from './configs/rehearsal-config.js';

export type MoveTasks = {
  initTask: (srcDir: string, options: MoveCommandOptions) => ListrTask;
  moveTask: (srcDir: string, options: MoveCommandOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type PackageEntry = { name: string; files: string[] };

export type GraphCommandOptions = {
  output?: string;
  devDeps: boolean;
  basePath: string;
};

export type GraphCommandContext = {
  skip?: boolean;
  source?: string;
  packageEntry?: string;
  jsSourcesAbs?: string[];
  childPackage?: string;
};

export type GraphTaskOptions = {
  srcDir: string;
  basePath: string;
  output?: string;
  devDeps: boolean;
};

export type GraphTasks = {
  graphOrderTask: (options: GraphTaskOptions, ctx?: MoveCommandContext) => ListrTask;
};

export type MoveCommandOptions = {
  graph: boolean;
  devDeps: boolean;
  dryRun: boolean;
  basePath: string;
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
  childPackageAbs?: string;
  childPackageRel?: string;
  childPackage?: string;
  migrationOrder?: { packages: PackageEntry[] };
};

export type MigrateCommandOptions = {
  skipInit: boolean;
  basePath: string;
  entrypoint: string;
  package: string;
  format: Formats[];
  verbose: boolean | undefined;
  userConfig: string | undefined;
  ci: boolean | undefined;
  dryRun: boolean;
  regen: boolean | undefined;
};

export type MigrateCommandContext = {
  skip: boolean;
  userConfig: UserConfig | undefined;
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
