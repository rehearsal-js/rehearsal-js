/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Package, PackageContainer } from '@rehearsal/migration-graph-shared';
import type { EmberAddonPackage } from './entities/ember-addon-package';
import type { EmberAppPackage } from './entities/ember-app-package';

export type EmberPackageContainer = {
  getInternalPackages?: (...args: any) => unknown;
  getExternalPackages?: (...args: any) => unknown;
  getExternalAddonPackages?: (...args: any) => unknown;
  getInternalAddonPackages?: (...args: any) => unknown;
  getAddonPackages?: (...args: any) => unknown;
  getRootPackage?: (...args: any) => unknown;
} & PackageContainer;

export type EmberProjectPackage = Package | EmberAddonPackage | EmberAppPackage;
