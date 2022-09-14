import { Report } from '@rehearsal/reporter';

export type CliConmand = `upgrade` | 'migrate';

export type migrateCommandOptions = {
  basePath: string;
  entrypoint: string;
  files: string;
  report: Array<string> | undefined;
  outputPath: string | undefined;
  verbose: boolean | undefined;
  clean: boolean | undefined;
  strict: boolean | undefined;
  userConfig: string | undefined;
};

export type migrateCommandContext = {
  skip: boolean;
  sourceFiles: Array<string>;
};

export type ParsedModuleResult = {
  edgeList: Array<[string, string | undefined]>;
  coreDepList: Array<string>;
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
  is_test: boolean | undefined;
};

export type dependencyConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};

export type setupConfigCommand = {
  command: string;
  args: string[];
};

export type setupConfig = {
  ts?: setupConfigCommand;
  lint?: setupConfigCommand;
};

export type CustomCommandConfig = {
  install?: dependencyConfig;
  setup?: setupConfig;
};

export type CustomConfig = {
  upgrade?: CustomCommandConfig;
  migrate?: CustomCommandConfig;
};
