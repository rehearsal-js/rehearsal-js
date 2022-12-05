/* eslint-disable @typescript-eslint/no-explicit-any */
import { dirname, resolve } from 'path';
import {
  isTesting,
  isWorkspace,
  Package,
  readPackageJson,
} from '@rehearsal/migration-graph-shared';
import { sync as fastGlobSync } from 'fast-glob';
import resolvePackagePath from 'resolve-package-path';
import debug from 'debug';

import { EmberAddonPackage } from './entities/ember-addon-package';
import { EmberAppPackage } from './entities/ember-app-package';

import { isAddon, isApp } from './utils/ember';
import { getInternalAddonTestFixtures } from './utils/environment';
import type { EmberPackageContainer as PackageContainer } from './types/package-container';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-ember:mappings-container');

type AddonName = string;
type AddonLocation = string;
type MappingsByAddonName = Record<AddonName, Package>;
type MappingsByLocation = Record<AddonLocation, Package>;

type MappingsLookup = {
  mappingsByAddonName: MappingsByAddonName;
  mappingsByLocation: MappingsByLocation;
};

type ExternalPackages = MappingsLookup;
type ExternalAddonPackages = MappingsLookup;

type InternalPackages = MappingsLookup;
type InternalAddonPackages = MappingsLookup;

interface InternalState {
  addonPackages: any;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: InternalAddonPackages;
}

class InternalState implements InternalState {
  name: string | undefined;
  moduleName: string | undefined;
  emberAddonName: string | undefined;
  packageMain: string | undefined;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: InternalAddonPackages;

  constructor() {
    this.addonPackages = {};
    this.externalAddonPackages = {
      mappingsByAddonName: {},
      mappingsByLocation: {},
    };
  }

  reset(): void {
    this.name = undefined;
    this.moduleName = undefined;
    this.emberAddonName = undefined;
    this.addonPackages = {};
    this.externalAddonPackages = {
      mappingsByAddonName: {},
      mappingsByLocation: {},
    };
  }
}

class RootInternalState extends InternalState {
  rootPackage: Package;

  constructor(rootPackage: Package) {
    super();
    this.rootPackage = rootPackage;
  }
}

type EntityFactoryOptions = {
  packageContainer: PackageContainer;
  type?: string;
};

// TODO rename mappingsByLocation to mappingsByPath

export function entityFactory(
  pathToPackage: string,
  options: EntityFactoryOptions
): EmberAppPackage | EmberAddonPackage | Package {
  let Klass;
  try {
    const packageJson = readPackageJson(pathToPackage);
    if (isAddon(packageJson)) {
      Klass = EmberAddonPackage;
    } else if (isApp(packageJson)) {
      Klass = EmberAppPackage;
    } else {
      Klass = Package;
    }
  } catch (e) {
    throw new Error(`Failed to read pathToPackage: ${pathToPackage}`);
  }

  return new Klass(pathToPackage, options);
}

class MappingsContainer {
  private internalState: RootInternalState;

  private static instance: MappingsContainer;

  constructor(pathToRoot: string) {
    DEBUG_CALLBACK('pathToRoot: %s', pathToRoot);
    const rootPackage = entityFactory(pathToRoot, {
      packageContainer: this.packageContainerInterface,
    });
    this.internalState = new RootInternalState(rootPackage);
  }

  public isEmberApp(): boolean {
    return isApp(this.internalState.rootPackage.packageJson);
  }

  public isEmberAddon(): boolean {
    return isAddon(this.internalState.rootPackage.packageJson);
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
    DEBUG_CALLBACK('resetInternalState: %s', rootPackage);
    this.internalState = new RootInternalState(rootPackage);
  }

  private setRootPackage(pathToRoot: string): void {
    // If the current rootPackage path differs from pathToRoot re-initialize
    if (isTesting() || !this.internalState || this.internalState?.rootPackage.path !== pathToRoot) {
      DEBUG_CALLBACK('setRootPackage: %s', pathToRoot);

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
          mappingsByLocation[emberAddonPackage.packagePath] = emberAddonPackage;
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
          mappingsByLocation[emberAddonPackage.packagePath] = emberAddonPackage;
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
    DEBUG_CALLBACK('globInternalPackages: %s', pathToRoot);
    const cwd = resolve(pathToRoot);

    // There is a bug (feature?) in fast glob where the exclude patterns include the `cwd`
    // when applying the exclude patterns.
    //
    // For example if we have our code checkout out to some directory called:
    // > `~/Code/tmp`
    //
    // The fastglob exclude pattern ``!**/tmp/**` will exclude anything in this directory
    // because the parent directory contains tmp
    //
    // So we must prefix our ignore glob patterns with our `pathToRoot`.
    //
    // This issue was discovered during a migration-graph.test.ts because we have a fixtures
    // directory.

    let pathToPackageJsonList = fastGlobSync(
      [
        `**/package.json`,
        `!${pathToRoot}/**/build/**`,
        `!${pathToRoot}/**/dist/**`,
        `!${pathToRoot}/**/blueprints/**`,
        `!${pathToRoot}/**/fixtures/**`,
        `!${pathToRoot}/**/node_modules/**`,
        `!${pathToRoot}/**/tmp/**`,
      ],
      {
        absolute: true,
        cwd,
      }
    );

    DEBUG_CALLBACK('globInternalPackages: %s', pathToPackageJsonList.length);

    pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) => dirname(pathToPackage));

    const entities = pathToPackageJsonList.map((pathToPackage) =>
      entityFactory(pathToPackage, {
        type: 'in-repo',
        packageContainer: this.packageContainerInterface,
      })
    );

    DEBUG_CALLBACK('globInternalPackages: %s', entities.length);

    const fixturePackages = getInternalAddonTestFixtures().map((fixturePath) =>
      entityFactory(fixturePath, {
        type: 'in-repo',
        packageContainer: this.packageContainerInterface,
      })
    );

    return [...entities, ...fixturePackages];
  }

  public getInternalPackages(pathToRoot = process.cwd(), clearCache = false): InternalPackages {
    if (clearCache) {
      this.clearCache();
    }

    this.setRootPackage(pathToRoot);

    if (isTesting() || !this.internalState.internalAddonPackages) {
      DEBUG_CALLBACK('getInternalPackages: No InternalAddonPackages');
      const mappingsByAddonName: MappingsByAddonName = {};
      const mappingsByLocation: MappingsByLocation = {};

      const internalEmberAddons = this.globInternalPackages(pathToRoot);

      for (const emberAddonPackage of internalEmberAddons) {
        mappingsByAddonName[emberAddonPackage.packageName] = emberAddonPackage;
        mappingsByLocation[emberAddonPackage.packagePath] = emberAddonPackage;
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
  public getInternalAddonPackages(
    pathToRoot = process.cwd(),
    clearCache = false
  ): InternalAddonPackages {
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
        mappingsByLocation[emberAddonPackage.packagePath] = emberAddonPackage;
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

// TODO Remove setRootPackage, and instead re-create the singleton instance similar to setRootPackage if the path differs,
// TODO Remove pathToRoot arugment to exposed API methods below
// TODO Inside methods, get the current root from an internal private method.

export function getRootPackage(pathToRoot: string): Package {
  return MappingsContainer.getInstance(pathToRoot).getRootPackage(pathToRoot);
}

export function getInternalPackages(pathToRoot: string, clearCache = false): InternalPackages {
  return MappingsContainer.getInstance(pathToRoot).getInternalPackages(pathToRoot, clearCache);
}

export function getExternalPackages(pathToRoot: string, clearCache = false): ExternalPackages {
  return MappingsContainer.getInstance(pathToRoot).getExternalPackages(pathToRoot, clearCache);
}

export function getAddonPackages(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getAddonPackages(pathToRoot, clearCache);
}

export function getInternalAddonPackages(
  pathToRoot: string,
  clearCache = false
): InternalAddonPackages {
  return MappingsContainer.getInstance(pathToRoot).getInternalAddonPackages(pathToRoot, clearCache);
}

export function getExternalAddonPackages(
  pathToRoot: string,
  clearCache = false
): ExternalAddonPackages {
  return MappingsContainer.getInstance(pathToRoot).getExternalAddonPackages(pathToRoot, clearCache);
}

export function getModuleMappings(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getAddonPackages(pathToRoot, clearCache);
}

export function getInternalModuleMappings(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getInternalAddonPackages(pathToRoot, clearCache);
}

export function getExternalModuleMappings(pathToRoot: string, clearCache = false): MappingsLookup {
  return MappingsContainer.getInstance(pathToRoot).getExternalAddonPackages(pathToRoot, clearCache);
}
