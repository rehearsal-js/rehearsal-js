import { getInternalPackages } from '../mappings-container';
import type { Package } from '@rehearsal/migration-graph-shared';
import type { EmberAddonPackage } from '../entities/ember-addon-package';
import type { EmberAppPackage } from '..//entities/ember-app-package';

export function discoverEmberPackages(
  rootDir: string
): Array<Package | EmberAppPackage | EmberAddonPackage> {
  const { mappingsByAddonName } = getInternalPackages(rootDir);
  return Array.from(Object.values(mappingsByAddonName));
}
