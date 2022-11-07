import { relative, resolve } from 'path';

import debug from 'debug';
import {
  ProjectGraph,
  dfs,
  Package,
  GraphNode,
  PackageNode,
  ModuleNode,
  Graph,
} from '@rehearsal/migration-graph-shared';
import { getInternalPackages } from '../mappings-container';
import { EmberAppPackage } from './ember-app-package';

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

export class EmberAppProjectGraph extends ProjectGraph {
  constructor(rootDir: string, sourceType: string) {
    super(rootDir, sourceType);
  }

  addPackageNodeToGraph(p: Package): GraphNode<PackageNode> {
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
          modules: new Graph<ModuleNode>(), // Stubbing this out
        });

        // Need to refactor data flow here. Seems odd how we're creating the graph node without modules the populating it after.
        // Probably should lazily populate this.

        depNode.content.modules = p.createModuleGraph({
          project: this,
          parent: depNode,
        });
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
}
