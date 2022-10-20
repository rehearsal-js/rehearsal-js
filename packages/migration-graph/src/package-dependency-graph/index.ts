import { EmberAddonPackage, EmberPackage } from '@rehearsal/migration-graph-ember';
import { Package } from '@rehearsal/migration-graph-shared';
import { ModuleNode } from '../types';
import { Graph } from '../utils/graph';

import { EmberAddonPackageDependencyGraph } from './ember-addon';
import { EmberAppDependencyGraphOptions, EmberAppPackageDependencyGraph } from './ember-app';
import { PackageDependencyGraph, PackageDependencyGraphOptions } from './package';

export type DependencyGraphOptions = EmberAppDependencyGraphOptions | PackageDependencyGraphOptions;
export { PackageDependencyGraph };
export { EmberAppPackageDependencyGraph };
export { EmberAddonPackageDependencyGraph };

export function createPackageDependencyGraph(
  p: Package | EmberPackage | EmberAddonPackage,
  options: DependencyGraphOptions = {}
): Graph<ModuleNode> {
  if (p instanceof EmberPackage) {
    return new EmberAppPackageDependencyGraph(p, options).discover();
  } else if (p instanceof EmberAddonPackage) {
    return new EmberAddonPackageDependencyGraph(p, options).discover();
  } else {
    return new PackageDependencyGraph(p, options).discover();
  }
}
