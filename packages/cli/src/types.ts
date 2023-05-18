import type { Formatters } from '@rehearsal/reporter';

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
  ignore: string[];
  output?: string;
  skipPrompt?: boolean;
};
