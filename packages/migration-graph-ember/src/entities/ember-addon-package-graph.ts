import fs from 'node:fs';
import { resolve } from 'node:path';
import { type IResolveOptions } from 'dependency-cruiser';
import debug, { type Debugger } from 'debug';
import { ResolveOptions, CachedInputFileSystem } from 'enhanced-resolve';
import { getEmberAddonName } from '../utils/ember.js';
import { EmberAddonPackage } from './ember-addon-package.js';
import { EmberAppPackageGraph, EmberAppPackageGraphOptions } from './ember-app-package-graph.js';

export type EmberAddonPackageGraphOptions = EmberAppPackageGraphOptions;

export interface IResolveOptions extends ResolveOptions {
  bustTheCache?: boolean;
  fileSystem: CachedInputFileSystem;
  resolveDeprecations: boolean;
}

export class EmberAddonPackageGraph extends EmberAppPackageGraph {
  protected debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);

  constructor(p: EmberAddonPackage, options: EmberAddonPackageGraphOptions = {}) {
    super(p, options);
  }

  override get resolveOptions(): IResolveOptions {
    const addonName = getEmberAddonName(this.package.path);

    if (!addonName) {
      console.warn('addonName is undefined, unable to create alias from app directory');
    }

    const alias: Record<string, string> = {};

    alias[addonName] = resolve(this.baseDir, 'addon');

    this.debug({
      baseDir: this.baseDir,
      alias,
    });

    const options = super.resolveOptions;

    options.alias = alias;

    return options;
  }
}
