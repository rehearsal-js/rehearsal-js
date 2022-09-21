export type CliCommand = `upgrade` | 'migrate';

export type MigrateCommandOptions = {
  basePath: string;
  entrypoint: string;
  files: string;
  report: string[];
  outputPath: string;
  verbose: boolean | undefined;
  clean: boolean | undefined;
  strict: boolean | undefined;
  userConfig: string | undefined;
};

export type MigrateCommandContext = {
  skip: boolean;
  sourceFiles: string[];
};

export type ParsedModuleResult = {
  edgeList: Array<[string, string | undefined]>;
  coreDepList: string[];
};

export type UpgradeCommandContext = {
  tsVersion: string;
  latestELRdBuild: string;
  currentTSVersion: string;
  skip: boolean;
};

export type UpgradeCommandOptions = {
  build: string;
  basePath: string;
  report: string[];
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
