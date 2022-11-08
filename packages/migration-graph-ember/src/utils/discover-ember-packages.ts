import { Package } from '@rehearsal/migration-graph-shared';
import { EmberAddonPackage } from 'src/entities/ember-addon-package';
import { EmberAppPackage } from 'src/entities/ember-app-package';
import { getInternalPackages } from '../mappings-container';

export function discoverEmberPackages(
  rootDir: string
): Array<Package | EmberAppPackage | EmberAddonPackage> {
  const { mappingsByAddonName } = getInternalPackages(rootDir);
  return Array.from(Object.values(mappingsByAddonName));
}
