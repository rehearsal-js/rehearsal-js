/* eslint-disable @typescript-eslint/no-explicit-any */

import { readPackageJson } from '@rehearsal/migration-graph-shared';

import {
  getEmberAddonName,
  getModuleNameFromMain,
  getNameFromMain,
  isEngine,
} from '../utils/ember';
import { type EmberPackageOptions, EmberAppPackage } from './ember-app-package';

export class EmberAddonPackage extends EmberAppPackage {
  isAddon: boolean;

  #name: string | undefined;
  #moduleName: string | undefined;
  #addonName: string | undefined;

  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    super(pathToPackage, options);
    this.isAddon = true;
  }

  get isEngine(): boolean {
    return isEngine(readPackageJson(this.path));
  }

  get excludePatterns(): Array<string> {
    // TODO Determine ember-config from package.json entry
    return [
      'dist',
      'config',
      'ember-config',
      'tests',
      'test-addon',
      '@ember/*',
      'public',
      './package',
    ];
  }

  get includePatterns(): Array<string> {
    // TODO Determine ember-config from package.json entry
    return ['index.js', 'addon/', 'app/'];
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
}
