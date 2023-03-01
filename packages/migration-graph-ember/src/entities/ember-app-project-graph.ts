import { dirname, resolve } from 'node:path';
import fastGlob from 'fast-glob';
import debug, { type Debugger } from 'debug';
import {
  GraphNode,
  Package,
  PackageNode,
  ProjectGraph,
  ProjectGraphOptions,
  readPackageJson,
} from '@rehearsal/migration-graph-shared';
import { isAddon, isApp } from '../utils/ember.js';
import { EmberAppPackage } from './ember-app-package.js';
import { EmberAddonPackage } from './ember-addon-package.js';
import type { EmberProjectPackage } from '../types.js';

const EXCLUDED_PACKAGES = ['test-harness'];

type EmberPackageLookup = {
  byAddonName: Record<string, EmberProjectPackage>;
  byPath: Record<string, EmberProjectPackage>;
};

export type EmberAppProjectGraphOptions = ProjectGraphOptions;

export class EmberAppProjectGraph extends ProjectGraph {
  protected override debug: Debugger = debug(
    `rehearsal:migration-graph-ember:${this.constructor.name}`
  );
  protected override discoveredPackages: Record<string, EmberProjectPackage> = {};
  private lookup?: EmberPackageLookup;

  constructor(rootDir: string, options?: EmberAppProjectGraphOptions) {
    super(rootDir, { sourceType: 'Ember Application', ...options });
    this.debug(`rootDir: %s, options: %o`, rootDir, options);
  }

  override addPackageToGraph(p: EmberProjectPackage, crawl = true): GraphNode<PackageNode> {
    this.debug('addPackageToGraph: "%s"', p.packageName);

    if (p instanceof EmberAddonPackage) {
      // Check the graph if it has this node already
      const hasNodeByPackageName = this.graph.hasNode(p.packageName);

      if (!hasNodeByPackageName) {
        const maybeNode: GraphNode<PackageNode> | undefined = this.findPackageByAddonName(p.name);
        // Create a registry entry for the packageName to ensure a update
        if (maybeNode) {
          this.graph.registry.set(p.packageName, maybeNode);
        }
      }
    }
    const node = super.addPackageToGraph(p, crawl);

    return node;
  }

  /**
   * Looks at a given package and sees if any of the addons and packages
   * are internal to the project.
   * @param pkg we want
   * @returns an array of found packages
   */
  override findInternalPackageDependencies(pkg: Package): Array<Package> {
    let deps: Array<Package> = [];

    const { byAddonName: mappingsByAddonName, byPath: mappingsByLocation } =
      this.getDiscoveredPackages();

    if (pkg.dependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies).map(
        (depName) => mappingsByAddonName[depName] as Package
      );
      deps = deps.concat(...somePackages);
    }

    if (pkg.devDependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.devDependencies).map(
        (depName) => mappingsByAddonName[depName] as Package
      );
      deps = deps.concat(...somePackages);
    }

    // When ever we come across an EmberAppPackage or EmberAddonPackage
    // We check packageJson.ember-addon.paths for additional dependencies.
    // This gives us additional dependency data not found from explicit dependency
    // and devDependency entries in package.json.
    if (isApp(pkg.packageJson) || isAddon(pkg.packageJson)) {
      const emberPackage = pkg as EmberAppPackage;

      if (emberPackage.addonPaths?.length) {
        // get the package by location
        deps = deps.concat(
          emberPackage.addonPaths.map(
            (addonPath: string) => mappingsByLocation[resolve(emberPackage.path, addonPath)]
          )
        );
      }
    }

    deps = deps.concat(super.findInternalPackageDependencies(pkg));

    return deps.filter((dep) => !!dep && !EXCLUDED_PACKAGES.includes(dep.packageName));
  }

  private isMatch(addonName: string, emberAddonPackage: EmberAddonPackage): boolean {
    return (
      addonName == emberAddonPackage.name ||
      addonName == emberAddonPackage.emberAddonName ||
      addonName == emberAddonPackage.moduleName
    );
  }

  /**
   *
   * @param addonName the name for an ember addon. This is defined by the index which may or may not match package.json's `name` entry.
   * @returns
   */
  findPackageByAddonName(addonName: string): GraphNode<PackageNode> | undefined {
    return Array.from(this.graph.nodes).find((n: GraphNode<PackageNode>) => {
      // this.debug('findPackageNodeByAddonName: %O', n.content);

      const somePackage: Package = n.content.pkg;

      if (
        n.content.key === addonName ||
        (somePackage instanceof EmberAddonPackage && this.isMatch(addonName, somePackage))
      ) {
        this.debug('Found an EmberAddonPackage %O', somePackage);
        return true;
      }
      return false;
    });
  }

  protected override discoveryByEntrypoint(entrypoint: string): EmberAppPackage {
    // Create a package to make sure things work, but ignore the rest.
    const p = new EmberAppPackage(this.rootDir);
    p.includePatterns = new Set([entrypoint]);
    this.addPackageToGraph(p, false);
    return p;
  }

  private entityFactory(pathToPackage: string): EmberProjectPackage {
    let packageJson;
    try {
      packageJson = readPackageJson(pathToPackage);
    } catch (e) {
      throw new Error(`Failed to readPackageJson in path: ${pathToPackage}`);
    }

    if (isAddon(packageJson)) {
      return new EmberAddonPackage(pathToPackage);
    } else if (isApp(packageJson)) {
      return new EmberAppPackage(pathToPackage);
    } else {
      return new Package(pathToPackage);
    }
  }

  private getDiscoveredPackages(): EmberPackageLookup {
    if (!this.lookup) {
      const foundPackages = Object.values(this.discoveredPackages);

      this.lookup = {
        byAddonName: {},
        byPath: {},
      };

      for (const pkg of foundPackages) {
        this.lookup.byAddonName[pkg.packageName] = pkg;
        this.lookup.byPath[pkg.path] = pkg;
      }
    }

    return this.lookup;
  }

  private findProjectPackages(): { root: EmberProjectPackage; found: Array<EmberProjectPackage> } {
    const pathToRoot = this.rootDir;

    this.debug('findProjectPackages: %s', pathToRoot);

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

    let pathToPackageJsonList = fastGlob.sync(
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

    this.debug('findProjectPackages: %a', pathToPackageJsonList);

    pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) => dirname(pathToPackage));

    // In `ProjectGraph.discover()` we filter out by non-workspace package.json files in a project.
    //
    // We don't want to do this in ember project. In an ember-project specifically ones that
    // used ember-engines the relationship between a package is defined by
    // `ember-addon.paths` in packageJson.
    // We use this `findInternalPackageDependencies()` above and it is called
    // in the base class in `ProjectGraph.discoverEdgesFromDependencies()
    //
    // This allows for all package.json files when read to construct a complete graph of dependencies.
    // Regardless of workspaces or ember-engines.
    //
    // The downside is that we don't limit the scope of direcotires we crawl. We may need to add more
    //  exclusions to the fastglob above to constrain packageJson discovery.
    //
    // This is why we can ignore workspace data defined in root package.json during discovery.

    const entities = pathToPackageJsonList.map((pathToPackage) =>
      this.entityFactory(pathToPackage)
    );

    const root = entities.find((pkg) => this.isRootPackage(pkg));

    if (!root) {
      throw new Error('Discovery failed, unable to find root package');
    }

    const found = entities.filter((pkg) => !this.isRootPackage(pkg));

    this.debug('findProjectPackages: %s', entities.length);

    return { root, found };
  }

  override discover(): Array<EmberProjectPackage> {
    // If an entrypoint is defined, we forgo any package discovery logic,
    // and create a stub.

    if (this.entrypoint) {
      return [this.discoveryByEntrypoint(this.entrypoint)];
    }

    const { root, found } = this.findProjectPackages();

    root.addExcludePattern(...this.exclude);
    root.addIncludePattern(...this.include);

    this.debug('Root Package is %s', root.constructor.name);
    this.debug('%s.excludePatterns', root.constructor.name, root.excludePatterns);
    this.debug('%s.includePatterns', root.constructor.name, root.includePatterns);

    const rootNode = this.addPackageToGraph(root);

    // Get rootPackage and add it to the graph.

    this.discoveredPackages = found.reduce(
      (acc: Record<string, Package>, pkg: EmberProjectPackage) => {
        const node = this.addPackageToGraph(pkg);
        this.graph.addEdge(rootNode, node);

        acc[pkg.packageName] = pkg;
        return acc;
      },
      {}
    );

    return found;
  }
}
