import type { Formatters, ReportItem } from '@rehearsal/reporter';

export type CliCommand = 'move' | 'graph' | 'fix';
export type PackageEntry = { name: string; files: string[] };
export type PackageSelection = {
  name: string;
  path: string;
};

export type ProjectType = 'base-ts' | 'ember' | 'glimmer';

export type PreReqTSConfig = {
  compilerOptions: {
    strict: boolean;
    skipLibCheck: boolean;
  };
  glint?: {
    environment: string;
  };
};

export type PreReqs = {
  node: string;
  eslint: string;
  tsconfig: PreReqTSConfig;
  deps: Record<string, string>;
};

export type MenuMap = {
  [key: string]: string;
};

/*
  ALL COMMANDS
*/

export type CommandContext = {
  skip?: boolean;
  input?: string;
  projectType?: ProjectType;
  targetPackageAbs?: string;
  workspaceRoot?: string;
  projectName: string;
  orderedFiles: string[];
  source?: string;
  packageEntry?: string;
};

export type MoveCommandOptions = {
  rootPath: string;
  ignore: string[];
  dryRun: boolean;
  graph?: boolean;
};

export type FixCommandOptions = {
  format: Formatters[];
  rootPath: string;
  ignore: string[];
  graph?: boolean;
  mode: 'single-pass' | 'drain';
};

/*
  GRAPH
*/
export type GraphCommandOptions = {
  rootPath: string;
  ignore: string[];
  output?: string;
  externals?: boolean;
};

export type GraphTaskOptions = {
  rootPath: string;
  ignore: string[];
  output?: string;
  externals?: boolean;
  graph?: boolean;
};

/*
  FIX
*/

type MessageContent = {
  reportItems: ReportItem[];
  fixedItemCount: number;
};
type MessageResponse = { type: 'message'; content: MessageContent };
type FilesResponse = { type: 'files'; content: string[] };
type LoggerResponse = { type: 'logger'; content: string };
export type FixWorkerResponse = MessageResponse | FilesResponse | LoggerResponse;

export type FixWorkerInput = {
  mode: 'single-pass' | 'drain';
  projectRootDir: string;
  packageDir: string;
  filesToMigrate: string[];
  reporterOptionsTSVersion: string;
  reporterOptionsProjectName: string;
  reporterOptionsProjectRootDir: string;
  reporterOptionsCommandName: string;
  ignore?: string[];
  configName?: string;
  format: Formatters[];
};
