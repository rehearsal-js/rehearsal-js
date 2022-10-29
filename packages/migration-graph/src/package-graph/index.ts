import { EmberAddonPackage, EmberAppPackage } from '@rehearsal/migration-graph-ember';
import { Package } from '@rehearsal/migration-graph-shared';
import { ModuleNode } from '../types';
import { Graph } from '../utils/graph';

import { EmberAddonPackageGraph } from './ember-addon-package-graph';
import { EmberAppPackageyGraphOptions, EmberAppPackageGraph } from './ember-app-package-graph';
import { PackageGraph, PackageGraphOptions } from './package-graph';

export type DependencyGraphOptions = EmberAppPackageyGraphOptions | PackageGraphOptions;
export { PackageGraph as PackageDependencyGraph };
export { EmberAppPackageGraph as EmberAppPackageDependencyGraph };
export { EmberAddonPackageGraph as EmberAddonPackageDependencyGraph };

export function createPackageDependencyGraph(
  p: Package | EmberAppPackage | EmberAddonPackage,
  options: DependencyGraphOptions = {}
): Graph<ModuleNode> {
  // Given the current inheritance we need to look at EmberAddon first.
  if (p instanceof EmberAddonPackage) {
    return new EmberAddonPackageGraph(p, options).discover();
  } else if (p instanceof EmberAppPackage) {
    return new EmberAppPackageGraph(p, options).discover();
  } else {
    return new PackageGraph(p, options).discover();
  }
}
