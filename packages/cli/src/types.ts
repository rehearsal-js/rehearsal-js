import { Report } from '@rehearsal/reporter';

export type CliCommand = `upgrade` | 'migrate';

export type MigrateCommandOptions = {
  basePath: string;
  entrypoint: string;
  files: string;
  report: string[] | undefined;
  outputPath: string | undefined;
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

export type FormatterFunction = (report: Report) => string;

export type FormatterMap = {
  [format: string]: FormatterFunction;
};

export type UpgradeCommandContext = {
  tsVersion: string;
  latestELRdBuild: string;
  currentTSVersion: string;
  skip: boolean;
};

export type UpgradeCommandOptions = {
  build: string;
  src_dir: string;
  autofix: boolean | undefined;
  dry_run: boolean | undefined;
  tsc_version: string;
  report_output: string;
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
