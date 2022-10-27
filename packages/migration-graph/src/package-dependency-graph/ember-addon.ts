import fs from 'fs';
import { resolve } from 'path';
import { Package } from '@rehearsal/migration-graph-shared';
import { IResolveOptions } from 'dependency-cruiser';
import { CachedInputFileSystem } from 'enhanced-resolve';
import { PackageDependencyGraphOptions, PackageDependencyGraph } from './package';

type EmberAddonPackageDependencyGraphOptions = PackageDependencyGraphOptions;

export class EmberAddonPackageDependencyGraph extends PackageDependencyGraph {
  constructor(p: Package, options: EmberAddonPackageDependencyGraphOptions = {}) {
    super(p, options);
  }

  get resolveOptions(): IResolveOptions {
    const addonName = this.package.packageJson.emberAddonName;

    const alias: Record<string, string> = {};
    alias[addonName] = resolve(this.baseDir, 'addon');

    return {
      fileSystem: new CachedInputFileSystem(fs, 4000),
      resolveDeprecations: false,
      alias: alias,
    };
  }
}
