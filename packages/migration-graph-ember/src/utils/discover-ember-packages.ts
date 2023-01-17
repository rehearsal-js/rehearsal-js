import { getInternalPackages } from '../mappings-container';

import type { EmberProjectPackage } from '../types';
export function discoverEmberPackages(rootDir: string): Array<EmberProjectPackage> {
  const { mappingsByAddonName } = getInternalPackages(rootDir);
  return Array.from(Object.values(mappingsByAddonName));
}
