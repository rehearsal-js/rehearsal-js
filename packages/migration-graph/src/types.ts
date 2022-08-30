/**
 * Should be moved into my-package-util
 */
export type Package = {
  path: string;
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  addonPaths?: Array<string>;
};

export type UniqueGraphNode = {
  key: string;
};

export type PackageNode = UniqueGraphNode & {
  pkg: Package;
  converted?: boolean;
};

export type FileNode = UniqueGraphNode & {
  path: string;
  parsed?: boolean;
};
