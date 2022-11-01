import fs from 'fs';
import { resolve } from 'path';
import { IResolveOptions } from 'dependency-cruiser';
import { CachedInputFileSystem } from 'enhanced-resolve';
import debug from 'debug';

import { getEmberAddonName } from '../utils/ember';
import { EmberAddonPackage } from './ember-addon-package';
import { EmberAppPackageGraph, EmberAppPackageyGraphOptions } from './ember-app-package-graph';

const DEBUG_CALLBACK = debug(
  'rehearsal:migration-graph:package-dependency-graph:EmberAddonPackageDependencyGraph'
);

export type EmberAddonPackageGraphOptions = EmberAppPackageyGraphOptions;

export class EmberAddonPackageGraph extends EmberAppPackageGraph {
  constructor(p: EmberAddonPackage, options: EmberAddonPackageGraphOptions = {}) {
    super(p, options);
  }

  get resolveOptions(): IResolveOptions {
    const addonName = getEmberAddonName(this.package.packagePath);

    if (!addonName) {
      console.warn('addonName is undefined, unable to create alias from app directory');
    }

    const alias: Record<string, string> = {};

    alias[addonName] = resolve(this.baseDir, 'addon');

    DEBUG_CALLBACK({
      baseDir: this.baseDir,
      alias,
    });

    const options = {
      fileSystem: new CachedInputFileSystem(fs, 4000),
      resolveDeprecations: false,
      alias: alias,
    };

    return options;
  }
}
