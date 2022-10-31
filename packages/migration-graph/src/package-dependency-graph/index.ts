import { EmberAddonPackage, EmberAppPackage } from '@rehearsal/migration-graph-ember';
import { Package } from '@rehearsal/migration-graph-shared';
import { ModuleNode } from '../types';
import { Graph } from '../utils/graph';

import { EmberAddonPackageDependencyGraph } from './ember-addon';
import { EmberAppPackageDependencyGraphOptions, EmberAppPackageDependencyGraph } from './ember-app';
import { PackageDependencyGraph, PackageDependencyGraphOptions } from './package';

export type DependencyGraphOptions =
  | EmberAppPackageDependencyGraphOptions
  | PackageDependencyGraphOptions;
export { PackageDependencyGraph };
export { EmberAppPackageDependencyGraph };
export { EmberAddonPackageDependencyGraph };

export function createPackageDependencyGraph(
  p: Package | EmberAppPackage | EmberAddonPackage,
  options: DependencyGraphOptions = {}
): Graph<ModuleNode> {
  // Given the current inheritance we need to look at EmberAddon first.
  if (p instanceof EmberAddonPackage) {
    return new EmberAddonPackageDependencyGraph(p, options).discover();
  } else if (p instanceof EmberAppPackage) {
    return new EmberAppPackageDependencyGraph(p, options).discover();
  } else {
    return new PackageDependencyGraph(p, options).discover();
  }
}
