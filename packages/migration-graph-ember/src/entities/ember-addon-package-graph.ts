import { resolve } from 'path';
import { type IResolveOptions } from 'dependency-cruiser';
import debug from 'debug';

import { getEmberAddonName } from '../utils/ember';
import { EmberAddonPackage } from './ember-addon-package';
import { EmberAppPackageGraph, EmberAppPackageGraphOptions } from './ember-app-package-graph';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-ember:ember-addon-package-graph');

export type EmberAddonPackageGraphOptions = EmberAppPackageGraphOptions;

export class EmberAddonPackageGraph extends EmberAppPackageGraph {
  constructor(p: EmberAddonPackage, options: EmberAddonPackageGraphOptions = {}) {
    super(p, options);
  }

  get resolveOptions(): IResolveOptions {
    const addonName = getEmberAddonName(this.package.path);

    if (!addonName) {
      console.warn('addonName is undefined, unable to create alias from app directory');
    }

    const alias: Record<string, string> = {};

    alias[addonName] = resolve(this.baseDir, 'addon');

    DEBUG_CALLBACK({
      baseDir: this.baseDir,
      alias,
    });

    const options = super.resolveOptions;

    options.alias = alias;

    return options;
  }
}
