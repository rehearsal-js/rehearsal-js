import type { Package } from './entities/package.js';

export type UniqueNode = {
  key: string;
  synthetic?: boolean;
};

export type PackageNode = UniqueNode & {
  pkg: Package;
  converted?: boolean;
};

export type ModuleNode = UniqueNode & {
  path: string;
  parsed?: boolean;
};
