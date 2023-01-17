import { relative, resolve } from 'path';

import debug from 'debug';
import {
  dfs,
  GraphNode,
  Package,
  PackageNode,
  ProjectGraph,
  ProjectGraphOptions,
} from '@rehearsal/migration-graph-shared';
import { getInternalPackages } from '../mappings-container';
import { discoverEmberPackages } from '../utils/discover-ember-packages';
import { EmberAppPackage } from './ember-app-package';
import { EmberAddonPackage } from './ember-addon-package';
import type { EmberProjectPackage } from '../types';

const EXCLUDED_PACKAGES = ['test-harness'];

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-ember:ember-app-project-graph');

function debugAnalysis(entry: GraphNode<PackageNode>): void {
  // Get this list of dependent nodes in some order
  const dependencies: GraphNode<PackageNode>[] = dfs(entry);
  const reportedNodes: Set<string> = new Set();

  if (!dependencies || dependencies.length < 1) {
    return;
  }

  if (dependencies[0].content.pkg === entry.content.pkg) {
    return;
  }

  DEBUG_CALLBACK('List of dependent packages, that need migration:');

  let taskNumber = 1;

  for (const someNode of dependencies) {
    if (someNode.content.pkg === entry.content.pkg) {
      break;
    }

    const packageData = someNode.content;

    const pkg = packageData?.pkg ?? undefined;

    if (!pkg) {
      continue;
    }

    const packageName = pkg.packageName ?? '';
    const duplicate = reportedNodes.has(packageName) ? 'DUPLICATE' : '';

    if (duplicate.length) {
      DEBUG_CALLBACK('Duplicate found');
      return;
    }

    const relativePath = relative(process.cwd(), pkg.path);
    const parentPkgName = someNode.parent?.content?.pkg?.packageName;

    let taskString = `${taskNumber++}. ${pkg.packageName} (./${relativePath})`;

    if (parentPkgName) {
      taskString = taskString.concat(` parent: ${parentPkgName}`);
    }

    if (packageData.converted) {
      DEBUG_CALLBACK('[X] DONE %s', taskString);
    } else {
      DEBUG_CALLBACK('[ ] TODO %s', taskString);
    }

    reportedNodes.add(packageName);
  }
}

export type EmberAppProjectGraphOptions = ProjectGraphOptions;

export class EmberAppProjectGraph extends ProjectGraph {
  protected discoveredPackages: Record<string, EmberProjectPackage> = {};

  constructor(rootDir: string, options?: EmberAppProjectGraphOptions) {
    super(rootDir, { sourceType: 'Ember Application', ...options });
  }

  addPackageToGraph(p: EmberProjectPackage, crawl = true): GraphNode<PackageNode> {
    DEBUG_CALLBACK('addPackageToGraph: "%s"', p.packageName);

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

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(node));

    return node;
  }

  /**
   * Looks at a given package and sees if any of the addons and packages
   * are internal to the project.
   * @param pkg we want
   * @returns an array of found packages
   */
  findInternalPackageDependencies(pkg: Package): Array<Package> {
    let deps: Array<Package> = [];

    const { mappingsByAddonName, mappingsByLocation } = getInternalPackages(this.rootDir);

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

    if (pkg instanceof EmberAppPackage) {
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
      // DEBUG_CALLBACK('findPackageNodeByAddonName: %O', n.content);

      const somePackage: Package = n.content.pkg;

      if (
        n.content.key === addonName ||
        (somePackage instanceof EmberAddonPackage && this.isMatch(addonName, somePackage))
      ) {
        DEBUG_CALLBACK('Found an EmberAddonPackage %O', somePackage);
        return true;
      }
      return false;
    });
  }

  discover(): Array<EmberProjectPackage> {
    const entities = discoverEmberPackages(this.rootDir);

    this.discoveredPackages = entities.reduce((acc: Record<string, Package>, pkg: Package) => {
      acc[pkg.packageName] = pkg;
      return acc;
    }, {});

    return entities;
  }
}
