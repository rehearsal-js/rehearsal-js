import { type PackageOptions, Package, Graph, ModuleNode } from '@rehearsal/migration-graph-shared';
import { getEmberAddonPaths } from '../utils/ember.js';
import { getEmberExcludePatterns } from '../utils/excludes.js';
import { EmberAppPackageGraph, EmberAppPackageGraphOptions } from './ember-app-package-graph.js';

export type EmberPackageOptions = PackageOptions;

export class EmberAppPackage extends Package {
  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    super(pathToPackage, { ...options });

    const { ignoredPaths = [] } = options;

    this.excludePatterns = new Set([...getEmberExcludePatterns(), ...this.addonPaths]);

    this.includePatterns = new Set(['.', '**/*.gjs', ...ignoredPaths]); // No longer isolate this to the app directory, include all files in dir.
  }

  get addonPaths(): Array<string> {
    return getEmberAddonPaths(this.packageJson);
  }

  override getModuleGraph(options: EmberAppPackageGraphOptions): Graph<ModuleNode> {
    if (this.graph) {
      return this.graph;
    }

    this.graph = new EmberAppPackageGraph(this, options).discover();

    return this.graph;
  }
}
