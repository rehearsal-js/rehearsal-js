import debug, { type Debugger } from 'debug';
import { Graph, ModuleNode, readPackageJson } from '@rehearsal/migration-graph-shared';
import { getNameFromMain, isEngine } from '../utils/ember.js';
import { getEmberExcludePatterns } from '../utils/excludes.js';
import { type EmberPackageOptions, EmberAppPackage } from './ember-app-package.js';
import {
  EmberAddonPackageGraph,
  type EmberAddonPackageGraphOptions,
} from './ember-addon-package-graph.js';

export class EmberAddonPackage extends EmberAppPackage {
  isAddon: boolean = true;

  moduleName: string;

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

    const alternativeName = getNameFromMain(this.path);
    if (alternativeName) {
      this.moduleName = alternativeName;
    } else {
      this.moduleName = this.packageName;
    }
  }

  get isEngine(): boolean {
    return isEngine(readPackageJson(this.path));
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
