/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PackageContainer } from '@rehearsal/migration-graph-shared';

export type EmberPackageContainer = {
  getInternalPackages?: (...args: any) => unknown;
  getExternalPackages?: (...args: any) => unknown;
  getExternalAddonPackages?: (...args: any) => unknown;
  getInternalAddonPackages?: (...args: any) => unknown;
  getAddonPackages?: (...args: any) => unknown;
  getRootPackage?: (...args: any) => unknown;
} & PackageContainer;
