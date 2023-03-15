import type { MigrationStrategy } from '@rehearsal/migration-graph';
import type { UserConfig } from './user-config.js';
import type { State } from './helpers/state.js';

export type CliCommand = 'upgrade' | 'migrate';
export type Formats = 'sarif' | 'json' | 'sonarqube' | 'md';

export * from './configs/rehearsal-config.js';

export type MigrateCommandOptions = {
  skipInit: boolean;
  basePath: string;
  entrypoint: string;
  format: Formats[];
  outputPath: string;
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

export type UpgradeCommandContext = {
  tsVersion: string;
  latestAvailableBuild: string;
  currentTSVersion: string;
  skip: boolean;
};

export type UpgradeCommandOptions = {
  build: string;
  basePath: string;
  format: Formats[];
  outputPath: string;
  tsVersion: string;
  dryRun: boolean;
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
