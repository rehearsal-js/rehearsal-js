import debug, { type Debugger } from 'debug';
import { Graph, ModuleNode, readPackageJson } from '@rehearsal/migration-graph-shared';
import {
  getEmberAddonName,
  getModuleNameFromMain,
  getNameFromMain,
  isEngine,
} from '../utils/ember.js';
import { getEmberExcludePatterns } from '../utils/excludes.js';
import { type EmberPackageOptions, EmberAppPackage } from './ember-app-package.js';
import {
  EmberAddonPackageGraph,
  type EmberAddonPackageGraphOptions,
} from './ember-addon-package-graph.js';

export class EmberAddonPackage extends EmberAppPackage {
  isAddon: boolean = true;

  #name: string | undefined;
  #moduleName: string | undefined;
  #addonName: string | undefined;

  protected debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);

  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    super(pathToPackage, {
      ...options,
    });

    this.excludePatterns = new Set([
      ...getEmberExcludePatterns(),
      '^app', // Addons ^app/ folder should not be converted to TS. https://docs.ember-cli-typescript.com/ts/with-addons#key-differences-from-apps
    ]);

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

  override getModuleGraph(options: EmberAddonPackageGraphOptions = {}): Graph<ModuleNode> {
    this.debug('getModuleGraph');
    if (this.graph) {
      return this.graph;
    }

    this.graph = new EmberAddonPackageGraph(this, options).discover();

    return this.graph;
  }
}
