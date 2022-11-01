import {
  Graph,
  ModuleNode,
  Package,
  PackageGraph,
  PackageGraphOptions,
} from '@rehearsal/migration-graph-shared';
import { EmberAppPackage } from './entities/ember-app-package';
import { EmberAddonPackage } from './entities/ember-addon-package';
import {
  EmberAddonPackageGraph,
  EmberAddonPackageGraphOptions,
} from './entities/ember-addon-package-graph';
import {
  EmberAppPackageyGraphOptions,
  EmberAppPackageGraph,
} from './entities/ember-app-package-graph';

export type DependencyGraphOptions =
  | EmberAppPackageyGraphOptions
  | EmberAddonPackageGraphOptions
  | PackageGraphOptions;
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
