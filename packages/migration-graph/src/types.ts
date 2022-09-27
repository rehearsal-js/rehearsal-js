import { Package } from '@rehearsal/migration-graph-shared';

import { Graph } from './utils/graph';

export type UniqueGraphNode = {
  key: string;
};

export type PackageNode = UniqueGraphNode & {
  pkg: Package;
  converted?: boolean;
  modules: Graph<ModuleNode>;
};

export type ModuleNode = UniqueGraphNode & {
  path: string;
  parsed?: boolean;
  meta?: unknown;
};
