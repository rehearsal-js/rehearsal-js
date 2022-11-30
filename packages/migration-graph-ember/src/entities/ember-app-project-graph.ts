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
      DEBUG_CALLBACK('[X] DONE %0', taskString);
    } else {
      DEBUG_CALLBACK('[ ] TODO %0', taskString);
    }

    reportedNodes.add(packageName);
  }
}

export type EmberAppProjectGraphOptions = ProjectGraphOptions;

export class EmberAppProjectGraph extends ProjectGraph {
  constructor(rootDir: string, options?: EmberAppProjectGraphOptions) {
    options = { sourceType: 'Ember Application', ...options };
    super(rootDir, options);
  }

  addPackageToGraph(
    p: EmberAppPackage | EmberAddonPackage | Package,
    crawl = true
  ): GraphNode<PackageNode> {
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
    const node = super.addPackageToGraph(p);

    if (crawl) {
      this.buildAnalyzedPackageTree(node);
    }

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(node));

    return node;
  }

  buildAnalyzedPackageTree(source: GraphNode<PackageNode>, depth = 1): void {
    const pkg = source?.content?.pkg;

    if (!pkg) {
      throw new Error('Unable to buildAnalyzedPackageTree; node has no package defined.');
    }

    const explicitDependencies = this.getExplicitPackageDependencies(pkg);

    DEBUG_CALLBACK('explicitDependencies: %O', explicitDependencies);

    explicitDependencies.forEach((p: Package | EmberAddonPackage) => {
      const dest = this.addPackageToGraph(p, false);

      DEBUG_CALLBACK('Adding edge from %s to %s', source.content.key, dest.content.key);

      this.graph.addEdge(source, dest);

      this.buildAnalyzedPackageTree(dest, depth + 1);
    });
  }

  getExplicitPackageDependencies(pkg: Package): Array<Package> {
    let deps: Array<Package> = [];

    const { mappingsByAddonName, mappingsByLocation } = getInternalPackages(this.rootDir);

    if (pkg.dependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies).map(
        (depName) => mappingsByAddonName[depName] as Package
      );
      deps = deps.concat(...somePackages);
    }

    if (pkg.devDependencies) {
      deps = deps.concat(
        ...(Object.keys(pkg.devDependencies)?.map(
          (devDepName) => mappingsByAddonName[devDepName]
        ) ?? [])
      );
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
      DEBUG_CALLBACK('findPackageNodeByAddonName: %O', n.content);

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

  discover(): Array<Package | EmberAppPackage | EmberAddonPackage> {
    return discoverEmberPackages(this.rootDir);
  }
}
