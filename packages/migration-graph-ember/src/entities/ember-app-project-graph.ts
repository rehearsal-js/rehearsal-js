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

  addPackageToGraph(p: EmberAppPackage | EmberAddonPackage | Package): GraphNode<PackageNode> {
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

    this.buildAnalyzedPackageTree(node);

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(node));

    return node;
  }

  buildAnalyzedPackageTree(currentNode: GraphNode<PackageNode>, depth = 1): void {
    // Ensure we're dealing with a full fledged node, otherwise it could be synthetic
    if (!currentNode.content?.synthetic) {
      return;
      // throw new Error('No package found for node ... TBD');
    }

    if (!currentNode?.content.pkg) {
      return;
    }

    const pkg = currentNode?.content?.pkg;

    if (!pkg) {
      throw new Error('Unable to buildAnalyzedPackageTree; node has no package defined.');
    }

    const explicitDependencies = this.getExplicitPackageDependencies(pkg);

    explicitDependencies.forEach((p: Package) => {
      const key = p.packageName;

      let depNode;

      if (!this.graph.hasNode(key)) {
        // DEBUG_CALLBACK('buildAnalyzedPackagTree - addNode');

        depNode = this.graph.addNode({
          key,
          pkg: p,
          converted: p.isConvertedToTypescript(),
        });

        // Need to refactor data flow here. Seems odd how we're creating the graph node without modules then populating it after.
        // Probably should lazily populate this.

        // depNode.content.modules = p.createModuleGraph({
        //   project: this,
        //   parent: depNode,
        // });
      } else {
        depNode = this.graph.getNode(key);
      }

      if (!depNode) {
        throw new Error(`Unable to find node for ${key}`);
      }

      this.graph.addEdge(currentNode, depNode);

      this.buildAnalyzedPackageTree(depNode, depth + 1);
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
      DEBUG_CALLBACK('findPackageNodeByAddonName: %0', n.content);

      const somePackage: Package = n.content.pkg;

      if (
        n.content.key === addonName ||
        (somePackage instanceof EmberAddonPackage && this.isMatch(addonName, somePackage))
      ) {
        DEBUG_CALLBACK('Found an EmberAddonPackage %0', somePackage);
        return true;
      }
      return false;
    });
  }

  discover(): Array<Package | EmberAppPackage | EmberAddonPackage> {
    return discoverEmberPackages(this.rootDir);
  }
}
