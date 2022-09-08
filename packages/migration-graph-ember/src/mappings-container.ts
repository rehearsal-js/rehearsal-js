/* eslint-disable @typescript-eslint/no-explicit-any */
import { sync } from 'fast-glob';
import { readJsonSync } from 'fs-extra';
import { dirname, resolve } from 'path';
import resolvePackagePath from 'resolve-package-path';

import { EmberAddonPackage } from './-private/entities/ember-addon-package';
import { EmberPackage } from './-private/entities/ember-package';
import {
  type MappingsByAddonName,
  type MappingsByLocation,
  MappingsLookup,
  RootInternalState,
} from './-private/entities/InternalState';
import { Package } from './-private/entities/package';
import type { PackageContainer } from './-private/types/package-container';
import { getInternalAddonTestFixtures, isTesting } from './-private/utils/test-environment';
import { isWorkspace } from './-private/utils/workspace';

type EntityFactoryOptions = {
  packageContainer: PackageContainer;
  type?: string;
};

function entityFactory(pathToPackage: string, options: EntityFactoryOptions): Package {
  let Klass = Package;
  try {
    const packageData = readJsonSync(resolve(pathToPackage, 'package.json'));
    if (packageData?.keywords?.includes('ember-addon')) {
      Klass = EmberAddonPackage;
    } else if (packageData['ember-addon']) {
      Klass = EmberPackage;
    }
  } catch (e) {
    console.log(`Failed to read pathToPackage: ${pathToPackage}`);
  }

  return new Klass(pathToPackage, options);
}

class MappingsContainer {
  private internalState: RootInternalState;

  private static instance: MappingsContainer;

  constructor(pathToRoot: string) {
    const rootPackage = entityFactory(pathToRoot, {
      packageContainer: this.packageContainerInterface,
    });
    this.internalState = new RootInternalState(rootPackage);
  }

  public static getInstance(pathToRoot: string): MappingsContainer {
    if (!MappingsContainer.instance) {
      MappingsContainer.instance = new MappingsContainer(pathToRoot);
    }
    return MappingsContainer.instance;
  }

  private get packageContainerInterface(): PackageContainer {
    return {
      getInternalPackages: this.getInternalPackages.bind(this),
      getExternalPackages: this.getExternalPackages.bind(this),
      getExternalAddonPackages: this.getExternalAddonPackages.bind(this),
      getInternalAddonPackages: this.getInternalAddonPackages.bind(this),
      getAddonPackages: this.getAddonPackages.bind(this),
      isWorkspace: this.isWorkspace.bind(this),
      addWorkspaceGlob: this.addWorkspaceGlob.bind(this),
      getRootPackage: this.getRootPackage.bind(this),
    };
  }

  private clearCache(): void {
    this.internalState.reset();
  }

  public getRootPackage(pathToRoot: string): Package {
    this.setRootPackage(pathToRoot);
    return this.internalState?.rootPackage;
  }

  public isWorkspace(pathToPackage: string): boolean {
    if (!this.internalState?.rootPackage) {
      throw new Error('Unable check isWorkspace; rootPackage is not defined');
    }
    return isWorkspace(this.internalState.rootPackage.path, pathToPackage);
  }

  public addWorkspaceGlob(glob: string): MappingsContainer {
    if (!this.internalState?.rootPackage) {
      throw new Error('Unable to addWorkspaceGlob; rootPackage is not defined');
    }
    this.internalState.rootPackage.addWorkspaceGlob(glob);
    return this;
  }

  private resetInternalState(rootPackage: Package): void {
    this.internalState = new RootInternalState(rootPackage);
  }

  private setRootPackage(pathToRoot: string): void {
    // If the current rootPackage path differs from pathToRoot re-initialize
    if (isTesting() || !this.internalState || this.internalState?.rootPackage.path !== pathToRoot) {
      const rootPackage = entityFactory(pathToRoot, {
        packageContainer: this.packageContainerInterface,
      });
      this.resetInternalState(rootPackage);
    }
  }

  /**
   * Get the external mappings for a given directory.
   * Traverses the node_modules and maps the packages by name and location.
   *
   * @param {string} pathToRoot - defaults to current working directory
   * @return {object} object with mappingsByName and mappingsByLocation
   */
  public getExternalPackages(pathToRoot = process.cwd(), clearCache = false): MappingsLookup {
    if (clearCache) {
      this.clearCache();
    }

    if (isTesting() || !this.internalState?.externalAddonPackages) {
      const mappingsByAddonName: MappingsByAddonName = {};
      const mappingsByLocation: MappingsByLocation = {};

      const dependencies = this.internalState?.rootPackage.dependencies || {};
      const devDependencies = this.internalState?.rootPackage.devDependencies || {};

      const packageNames = Object.keys({
        ...dependencies,
        ...devDependencies,
      });
      const emberAddons = packageNames
        .map((dependency) => resolvePackagePath(dependency, pathToRoot))
        .filter((maybePathToPackage): boolean => {
          return !!maybePathToPackage;
        })
        .map((pathToPackage) => {
          if (pathToPackage) {
            return entityFactory(dirname(pathToPackage), {
              type: 'node_modules',
              packageContainer: this.packageContainerInterface,
            });
          }
        });

      for (const emberAddonPackage of emberAddons) {
        if (emberAddonPackage) {
          mappingsByAddonName[emberAddonPackage.packageName] = emberAddonPackage;
          mappingsByLocation[emberAddonPackage.location] = emberAddonPackage;
        }
      }

      this.internalState.externalAddonPackages = {
        mappingsByAddonName,
        mappingsByLocation,
      };
    }
    return this.internalState.externalAddonPackages;
  }

  /**
   * Get the external mappings for a given directory.
   * Traverses the node_modules and maps the packages by name and location.
   *
   * @param {string} pathToRoot - defaults to current working directory
   * @return {object} object with mappingsByName and mappingsByLocation
   */
  public getExternalAddonPackages(pathToRoot = process.cwd(), clearCache = false): MappingsLookup {
    if (clearCache) {
      this.clearCache();
    }

    this.setRootPackage(pathToRoot);

    if (isTesting() || !this.internalState.externalAddonPackages) {
      const mappingsByAddonName: MappingsByAddonName = {};
      const mappingsByLocation: MappingsByLocation = {};

      const dependencies = this.internalState?.rootPackage?.dependencies || {};
      const devDependencies = this.internalState?.rootPackage?.devDependencies || {};

      const emberAddons = Object.keys({
        ...dependencies,
        ...devDependencies,
      })
        .map((dependency) => resolvePackagePath(dependency, pathToRoot))
        .filter((maybePathToPackage) => !!maybePathToPackage)
        .map((pathToPackage) => {
          if (pathToPackage) {
            return entityFactory(dirname(pathToPackage), {
              type: 'node_modules',
              packageContainer: this.packageContainerInterface,
            });
          }
        })
        .filter((addon) => addon instanceof EmberAddonPackage && addon?.isAddon);

      for (const emberAddonPackage of emberAddons) {
        if (emberAddonPackage) {
          mappingsByAddonName[emberAddonPackage.packageName] = emberAddonPackage;
          mappingsByLocation[emberAddonPackage.location] = emberAddonPackage;
        }
      }

      this.internalState.externalAddonPackages = {
        mappingsByAddonName,
        mappingsByLocation,
      };
    }
    return this.internalState.externalAddonPackages;
  }

  private globInternalPackages(pathToRoot: string): Package[] {
    const appPackages = sync(
      [
        '**/package.json',
        '!**/build/**',
        '!**/dist/**',
        '!**/blueprints/**',
        '!**/fixtures/**',
        '!**/node_modules/**',
        '!**/tmp/**',
      ],
      {
        absolute: true,
        cwd: pathToRoot,
      }
    )
      .map((pathToPackage) => dirname(pathToPackage))
      .map((pathToPackage) =>
        entityFactory(pathToPackage, {
          type: 'in-repo',
          packageContainer: this.packageContainerInterface,
        })
      );

    const fixturePackages = getInternalAddonTestFixtures().map((fixturePath) =>
      entityFactory(fixturePath, {
        type: 'in-repo',
        packageContainer: this.packageContainerInterface,
      })
    );

    return [...appPackages, ...fixturePackages];
  }

  public getInternalPackages(pathToRoot = process.cwd(), clearCache = false): any {
    if (clearCache) {
      this.clearCache();
    }

    this.setRootPackage(pathToRoot);

    if (isTesting() || !this.internalState.internalAddonPackages) {
      const mappingsByAddonName: MappingsByAddonName = {};
      const mappingsByLocation: MappingsByLocation = {};

      const internalEmberAddons = this.globInternalPackages(pathToRoot);

      for (const emberAddonPackage of internalEmberAddons) {
        mappingsByAddonName[emberAddonPackage.packageName] = emberAddonPackage;
        mappingsByLocation[emberAddonPackage.location] = emberAddonPackage;
      }

      this.internalState.internalAddonPackages = {
        mappingsByAddonName,
        mappingsByLocation,
      };
    }

    return this.internalState.internalAddonPackages;
  }

  /**
   * Get the internal mappings for a given directory.
   * Traverses the internal packages (using a glob)
   * and maps the packages by name and location.
   *
   * @param {string} pathToRoot - defaults to current working directory
   * @return {object} object with mappingsByName and mappingsByLocation
   */
  public getInternalAddonPackages(pathToRoot = process.cwd(), clearCache = false): any {
    if (clearCache) {
      this.clearCache();
    }
    this.setRootPackage(pathToRoot);

    if (isTesting() || !this.internalState.internalAddonPackages) {
      const mappingsByAddonName: MappingsByAddonName = {};
      const mappingsByLocation: MappingsByLocation = {};

      const internalEmberAddons = this.globInternalPackages(pathToRoot).filter(
        (addon) => addon instanceof EmberAddonPackage && addon?.isAddon
      );

      for (const emberAddonPackage of internalEmberAddons) {
        mappingsByAddonName[emberAddonPackage.packageName] = emberAddonPackage;
        mappingsByLocation[emberAddonPackage.location] = emberAddonPackage;
      }
      this.internalState.internalAddonPackages = {
        mappingsByAddonName,
        mappingsByLocation,
      };
    }
    return this.internalState.internalAddonPackages;
  }

  /**
   * Get the internal and external mappings for a given directory.
   * Traverses the node_modules and internal packages (using a glob)
   * and maps the packages by name and location.
   *
   * @param {string} pathToRoot - defaults to current working directory
   * @return {object} contains internalMappings and externalMappings
   */
  public getAddonPackages(pathToRoot = process.cwd(), clearCache = false): any {
    if (clearCache) {
      this.clearCache();
    }
    this.setRootPackage(pathToRoot);

    if (isTesting() || !this.internalState.addonPackages) {
      const mappings = { mappingsByAddonName: {}, mappingsByLocation: {} };
      const internalMappings = this.getInternalAddonPackages(pathToRoot);
      const externalMappings = this.getExternalAddonPackages(pathToRoot);

      Object.assign(mappings.mappingsByAddonName, internalMappings.mappingsByAddonName);

      Object.assign(mappings.mappingsByAddonName, externalMappings.mappingsByAddonName);

      Object.assign(mappings.mappingsByLocation, internalMappings.mappingsByLocation);

      Object.assign(mappings.mappingsByLocation, externalMappings.mappingsByLocation);
      this.internalState.addonPackages = mappings;
    }
    return this.internalState.addonPackages;
  }
}

export function getRootPackage(pathToRoot: string): Package {
  return MappingsContainer.getInstance(pathToRoot).getRootPackage(pathToRoot);
}

export function getInternalPackages(pathToRoot: string, clearCache = false): any {
  return MappingsContainer.getInstance(pathToRoot).getInternalPackages(pathToRoot, clearCache);
}

export function getExternalPackages(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getExternalPackages(pathToRoot, clearCache);
}

export function getAddonPackages(pathToRoot: string, clearCache = false): any {
  return MappingsContainer.getInstance(pathToRoot).getAddonPackages(pathToRoot, clearCache);
}

export function getInternalAddonPackages(pathToRoot: string, clearCache = false): any {
  return MappingsContainer.getInstance(pathToRoot).getInternalAddonPackages(pathToRoot, clearCache);
}

export function getExternalAddonPackages(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getExternalAddonPackages(pathToRoot, clearCache);
}

export function getModuleMappings(pathToRoot: string, clearCache = false): any {
  return MappingsContainer.getInstance(pathToRoot).getAddonPackages(pathToRoot, clearCache);
}

export function getInternalModuleMappings(pathToRoot: string, clearCache = false): any {
  return MappingsContainer.getInstance(pathToRoot).getInternalAddonPackages(pathToRoot, clearCache);
}

export function getExternalModuleMappings(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getExternalAddonPackages(pathToRoot, clearCache);
}
