export type PackageContainer = {
  getInternalPackages?: Function;
  getExternalPackages?: Function;
  getExternalAddonPackages?: Function;
  getInternalAddonPackages?: Function;
  getAddonPackages?: Function;
  isWorkspace?: Function;
  addWorkspaceGlob?: Function;
  getRootPackage?: Function;
};
