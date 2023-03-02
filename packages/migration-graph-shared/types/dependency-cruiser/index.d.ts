// this file exists because dependency-cruiser types are not being bundled correctly with ESM

import type { ResolveOptions } from 'enchanged-resolve';

declare module 'dependency-cruiser' {
  export function cruise(
    pOptions: ICruiseOptions,
    pResolveOptions?: IResolveOptions
  ): Promise<ICruiseResult>;
}

export interface ICruiseOptions {
  exclude?: {
    path?: string[];
  };
  baseDir?: string;
}

export interface IModule {
  coreModule?: boolean;
  couldNotResolve?: boolean;
  source: string;
  dependencies: IDependency[];
}

export interface IDependency {
  coreModule?: boolean;
  couldNotResolve?: boolean;
  resolved: string;
}

export interface IReporterOutput {
  output: ICruiseResult | string;
  exitCode: number;
}

export interface ICruiseResult {
  modules: IModule[];
}

export interface IResolveOptions extends ResolveOptions {
  bustTheCache?: boolean;
  fileSystem: CachedInputFileSystem;
  resolveDeprecations: boolean;
  alias?: Record<string, string>;
  extensions?: string[];
}
