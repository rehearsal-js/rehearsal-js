import { resolve } from 'node:path';
import debug, { type Debugger } from 'debug';
import { EmberAddonPackage } from './ember-addon-package.js';
import { EmberAppPackageGraph, EmberAppPackageGraphOptions } from './ember-app-package-graph.js';

import type { IResolveOptions } from '@rehearsal/migration-graph-shared/types/dependency-cruiser/index.js';

export type EmberAddonPackageGraphOptions = EmberAppPackageGraphOptions;

export class EmberAddonPackageGraph extends EmberAppPackageGraph {
  override debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);

  constructor(p: EmberAddonPackage, options: EmberAddonPackageGraphOptions = {}) {
    super(p, options);
  }

  override get resolveOptions(): IResolveOptions {
    const alias: Record<string, string> = {};

    alias[this.package.packageName] = resolve(this.baseDir, 'addon');

    this.debug({
      baseDir: this.baseDir,
      alias,
    });

    const options = super.resolveOptions;

    options.alias = alias;

    return options;
  }
}
