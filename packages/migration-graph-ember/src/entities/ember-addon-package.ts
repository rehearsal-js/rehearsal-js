/* eslint-disable @typescript-eslint/no-explicit-any */

import { Graph, ModuleNode, readPackageJson } from '@rehearsal/migration-graph-shared';

import {
  getEmberAddonName,
  getModuleNameFromMain,
  getNameFromMain,
  isEngine,
} from '../utils/ember';
import {
  EmberAddonPackageGraph,
  type EmberAddonPackageGraphOptions,
} from './ember-addon-package-graph';
import { type EmberPackageOptions, EmberAppPackage } from './ember-app-package';

export class EmberAddonPackage extends EmberAppPackage {
  isAddon: boolean = true;

  #name: string | undefined;
  #moduleName: string | undefined;
  #addonName: string | undefined;

  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    super(pathToPackage, {
      ...options,
    });

    const excludeDirs = [
      'dist',
      'config',
      'ember-config',
      '@ember/*',
      'public',
      'app', // Addons app/ folder should not be converted to TS. https://docs.ember-cli-typescript.com/ts/with-addons#key-differences-from-apps
    ];

    const excludeFiles = [
      'ember-cli-build.js',
      'testem.js',
      'index.js', // Ignore index.js because it's a CJS use to interact with the build pipeline.
    ];

    this.excludePatterns = new Set([...excludeDirs, ...excludeFiles]);

    this.includePatterns = new Set(['.', '**/*.gjs']);
  }

  get isEngine(): boolean {
    return isEngine(readPackageJson(this.path));
  }

  /**
   * The name should be the value from packageJson,
   * which is retrieved by Package.name
   */
  get name(): string {
    if (!this.#name) {
      this.#name = getNameFromMain(this.path);
    }
    return this.#name;
  }

  // return the value of the field in the main
  get moduleName(): string {
    if (!this.#moduleName) {
      this.#moduleName = getModuleNameFromMain(this.path);
    }
    return this.#moduleName;
  }

  get emberAddonName(): string {
    if (!this.#addonName) {
      this.#addonName = getEmberAddonName(this.path);
    }
    return this.#addonName;
  }

  getModuleGraph(options: EmberAddonPackageGraphOptions = {}): Graph<ModuleNode> {
    if (this.graph) {
      return this.graph;
    }

    this.graph = new EmberAddonPackageGraph(this, options).discover();

    return this.graph;
  }
}
