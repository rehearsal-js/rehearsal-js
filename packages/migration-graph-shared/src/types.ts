import type { Package } from './entities/package';
import type { Graph } from './graph';

export type UniqueNode = {
  key: string;
  synthetic?: boolean;
};

export type PackageNode = UniqueNode & {
  pkg: Package | undefined;
  modules: Graph<ModuleNode>;
  converted?: boolean;
};

export type ModuleNode = UniqueNode & {
  path: string;
  parsed?: boolean;
};
