import type { MigrationStrategy } from '@rehearsal/migration-graph';
import type { UserConfig } from './user-config';
import type { State } from './helpers/state';

export type CliCommand = 'upgrade' | 'migrate';
export type Formats = 'sarif' | 'json' | 'sonarqube' | 'md';

export type MigrateCommandOptions = {
  basePath: string;
  entrypoint: string;
  format: Formats[];
  outputPath: string;
  verbose: boolean | undefined;
  userConfig: string | undefined;
  interactive: boolean | undefined;
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

export type DependencyConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};

export type SetupConfigCommand = {
  command: string;
  args: string[];
};

export type SetupConfig = {
  ts?: SetupConfigCommand;
  lint?: SetupConfigCommand;
};

export type CustomCommandConfig = {
  install?: DependencyConfig;
  setup?: SetupConfig;
};

export type CustomConfig = {
  upgrade?: CustomCommandConfig;
  migrate?: CustomCommandConfig;
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
};
