import { relative, resolve } from 'path';
import {
  type PackageOptions,
  Package,
  Graph,
  ModuleNode,
  IPackage,
} from '@rehearsal/migration-graph-shared';
import { EmberAppPackageGraph, EmberAppPackageGraphOptions } from './ember-app-package-graph';

export type EmberPackageOptions = PackageOptions;

export class EmberAppPackage extends Package implements IPackage {
  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    const excludePatterns = [
      // files
      '.ember-cli.js',
      'ember-cli-build.js',
      'ember-config.js',
      'index.js',
      'testem.js',

      // Directories
      'dist',
      'config',
      'ember-config',
      'tests',
      '@ember/*',
      'public',
    ];

    const includePatterns = ['app'];

    super(pathToPackage, { excludePatterns, includePatterns, ...options });
  }

  get addonPaths(): Array<string> {
    return this.packageJson['ember-addon']?.paths;
  }

  hasAddonPath(packageInstance: Package): string | undefined {
    return this.addonPaths?.find(
      (addonPath: string) => packageInstance.packagePath === resolve(this.path, addonPath)
    );
  }

  /**
   * The `packageInstance` is package representing the desired in-repo addon to add
   * to `ember-addon.paths` of the current package. It will add the relative path
   * between this location and the desired package to `ember-addon.paths`.
   *
   * @param {EmberAddonPackage} packageInstance The `EmberAddonPackage` instance
   * @return instance of EmberPackage
   */
  addAddonPath(packageInstance: Package): this {
    if (!packageInstance) {
      throw new Error('`packageInstance` must be provided as an argument to `addAddonPath`');
    }

    if (!this.addonPaths) {
      this.addPackageJsonKey('ember-addon.paths', []);
    }

    if (!this.hasAddonPath(packageInstance)) {
      this.addonPaths.push(relative(this.path, packageInstance.path));
    }

    return this;
  }

  /**
   * The `packageInstance` is package representing the desired in-repo addon to remove
   * from `ember-addon.paths` of the current package. It will remove the correct relative
   * path (if it exists) from `ember-addon.paths`.
   *
   * @param {EmberAddonPackage} packageInstance The `EmberAddonPackage` instance
   * @return instance of EmberPackage
   */
  removeAddonPath(packageInstance: Package): this {
    if (!packageInstance) {
      throw new Error('`packageInstance` must be provided as an argument to `removeAddonPath`');
    }

    // bail early if the desired package isn't part of `ember-addon.paths`,
    // in this case there's nothing to remove
    if (!this.hasAddonPath(packageInstance)) {
      return this;
    }

    this.addonPaths.splice(
      this.addonPaths.findIndex(
        (addonPath) =>
          // get absolute path of desired package (desiredPackage.location)
          // /some/path/to/your-app/lib/msg-data === resolve('/some/path/to/your-app/lib/msg-overlay', '../lib/msg-data'))
          packageInstance.packagePath === resolve(this.path, addonPath)
      ),
      1
    );

    return this;
  }

  getModuleGraph(options: EmberAppPackageGraphOptions = {}): Graph<ModuleNode> {
    if (this.graph) {
      return this.graph;
    }

    this.graph = new EmberAppPackageGraph(this, options).discover();

    return this.graph;
  }
}
