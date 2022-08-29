import { resolve, relative } from 'path';

import { Package, type PackageOptions } from './package';
import { InternalState } from '../entities/InternalState';

export class EmberPackage extends Package {
  protected internalState: InternalState;

  constructor(pathToPackage: string, options: PackageOptions = {}) {
    super(pathToPackage, options);
    this.internalState = new InternalState();
  }

  get addonPaths(): Array<string> {
    return this.packageJson['ember-addon']?.paths;
  }

  hasAddonPath(packageInstance: Package): string | undefined {
    return this.addonPaths?.find(
      (addonPath: string) => packageInstance.location === resolve(this.path, addonPath)
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
          packageInstance.location === resolve(this.path, addonPath)
      ),
      1
    );

    return this;
  }
}
