import fs from 'fs';
import { resolve } from 'path';
import { EmberAddonPackage, getEmberAddonName } from '@rehearsal/migration-graph-ember';
import { IResolveOptions } from 'dependency-cruiser';
import { CachedInputFileSystem } from 'enhanced-resolve';
import debug from 'debug';

import { EmberAppPackageDependencyGraph, EmberAppPackageDependencyGraphOptions } from './ember-app';

const DEBUG_CALLBACK = debug(
  'rehearsal:migration-graph:package-dependency-graph:EmberAddonPackageDependencyGraph'
);

type EmberAddonPackageDependencyGraphOptions = EmberAppPackageDependencyGraphOptions;

export class EmberAddonPackageDependencyGraph extends EmberAppPackageDependencyGraph {
  constructor(p: EmberAddonPackage, options: EmberAddonPackageDependencyGraphOptions = {}) {
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
