export { buildMigrationGraph, discoverEmberPackages } from './migration-graph';
export { GraphNode } from './utils/graph-node';
export { Graph } from './utils/graph';
export { createDependencyGraph } from './file-dependency-graph';
export {
  isModuleRelative,
  isModuleNonRelative,
  isDirectoryPackage,
  getMainEntrypoint,
  resolveRelativeModule,
} from './module-resolution';

export {
  getMigrationStrategy,
  type MigrationStrategy,
  type MigrationStrategyOptions,
  type SourceFile,
} from './migration-strategy';

export type { UniqueGraphNode, PackageNode, ModuleNode } from './types';
