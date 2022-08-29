/* eslint-disable @typescript-eslint/no-explicit-any */
export type PackageContainer = {
  getInternalPackages?: (...args: any) => unknown;
  getExternalPackages?: (...args: any) => unknown;
  getExternalAddonPackages?: (...args: any) => unknown;
  getInternalAddonPackages?: (...args: any) => unknown;
  getAddonPackages?: (...args: any) => unknown;
  isWorkspace?: (...args: any) => unknown;
  addWorkspaceGlob?: (...args: any) => unknown;
  getRootPackage?: (...args: any) => unknown;
};
