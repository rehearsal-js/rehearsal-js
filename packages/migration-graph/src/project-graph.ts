import { relative, resolve } from 'path';
import {
  EmberAddonPackage,
  EmberAppPackage,
  getInternalPackages,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { Package, readPackageJson } from '@rehearsal/migration-graph-shared';
import debug from 'debug';

import { createPackageDependencyGraph } from './package-graph';
import { dfs } from './utils/dfs';
import { Graph } from './utils/graph';
import type { GraphNode } from './utils/graph-node';
import type { ModuleNode, PackageNode } from './types';

const DEBUG_CALLBACK = debug('rehearsal:project-graph');

const EXCLUDED_PACKAGES = ['test-harness'];

export enum DetectedSource {
  EmberApp = 'Ember Application',
  EmberAddon = 'Ember Addon',
  Library = 'Javascript Library',
}

// TODO this package level dependency data should be surfaced in a report

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

  for (const someGraphNode of dependencies) {
    if (someGraphNode.content.pkg === entry.content.pkg) {
      break;
    }

    const packageData = someGraphNode.content;

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
    const parentPkgName = someGraphNode.parent?.content?.pkg?.packageName;

    let taskString = `${taskNumber++}. ${pkg.packageName} (./${relativePath})`;

    if (parentPkgName) {
      taskString = taskString.concat(` parent: ${parentPkgName}`);
    }

    if (packageData.converted) {
      DEBUG_CALLBACK(`[X] DONE ${taskString}`);
    } else {
      DEBUG_CALLBACK(`[ ] TODO ${taskString}`);
    }

    reportedNodes.add(packageName);
  }
}

export class ProjectGraph {
  #rootDir: string;
  #detectedSource: DetectedSource;
  #graph: Graph<PackageNode>;

  constructor(rootDir: string) {
    this.#rootDir = rootDir;

    const packageJson = readPackageJson(rootDir);

    this.#detectedSource = isEmberAddon(packageJson)
      ? DetectedSource.EmberAddon
      : isEmberApp(packageJson)
      ? DetectedSource.EmberApp
      : DetectedSource.Library;

    this.#graph = new Graph<PackageNode>();
  }

  get rootDir(): string {
    return this.#rootDir;
  }

  get graph(): Graph<PackageNode> {
    return this.#graph;
  }

  get sourceType(): DetectedSource {
    return this.#detectedSource;
  }

  addPackageToGraph(p: Package): GraphNode<PackageNode> {
    DEBUG_CALLBACK(`\n------------------`);
    DEBUG_CALLBACK(`Package Name: ${p.packageName}`);
    DEBUG_CALLBACK(`Package Path: ${p.packagePath}`);

    const isConverted = p.isConvertedToTypescript('source-only');

    const contents = {
      key: p.packageName,
      pkg: p,
      converted: isConverted,
      modules: new Graph<ModuleNode>(),
    };

    const entry: GraphNode<PackageNode> = this.#graph.hasNode(p.packageName)
      ? this.#graph.updateNode(p.packageName, contents)
      : this.#graph.addNode(contents);

    let modules;

    if (!isConverted) {
      modules = createPackageDependencyGraph(p, { project: this, parent: entry });
    } else {
      modules = new Graph<ModuleNode>();
      DEBUG_CALLBACK('This package appears to be written in Typescript.');
    }

    entry.content.modules = modules;

    this.buildAnalyzedPackageTree(entry);

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(entry));
    return entry;
  }

  buildAnalyzedPackageTree(currentNode: GraphNode<PackageNode>, depth = 1): void {
    // Ensure we're dealing with a full fledges node, otherwise it could be synthetic
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

      if (!this.#graph.hasNode(key)) {
        // DEBUG_CALLBACK('buildAnalyzedPackagTree - addNode');

        depNode = this.#graph.addNode({
          key,
          pkg: p,
          converted: p.isConvertedToTypescript(),
          modules: new Graph<ModuleNode>(), // Stubbing this out
        });

        // Need to refactor data flow here. Seems odd how we're creating the graph node without modules the populating it after.
        // Probably should lazily populate this.

        depNode.content.modules = createPackageDependencyGraph(p, {
          project: this,
          parent: depNode,
        });
      } else {
        depNode = this.#graph.getNode(key);
      }

      if (!depNode) {
        throw new Error(`Unable to find node for ${key}`);
      }

      this.#graph.addEdge(currentNode, depNode);

      this.buildAnalyzedPackageTree(depNode, depth + 1);
    });
  }

  getExplicitPackageDependencies(
    pkg: Package
  ): Array<Package | EmberAppPackage | EmberAddonPackage> {
    const { mappingsByAddonName, mappingsByLocation } = getInternalPackages(this.rootDir);

    let explicitDependencies: Array<Package> = [];

    if (pkg.dependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies).map(
        (depName) => mappingsByAddonName[depName] as Package
      );
      explicitDependencies = explicitDependencies.concat(...somePackages);
    }

    if (pkg.devDependencies) {
      explicitDependencies = explicitDependencies.concat(
        ...(Object.keys(pkg.devDependencies)?.map(
          (devDepName) => mappingsByAddonName[devDepName]
        ) ?? [])
      );
    }
    if (pkg instanceof EmberAppPackage) {
      const emberPackage = pkg as EmberAppPackage;

      if (emberPackage.addonPaths?.length) {
        // get the package by location
        explicitDependencies = explicitDependencies.concat(
          emberPackage.addonPaths.map(
            (addonPath: string) => mappingsByLocation[resolve(emberPackage.path, addonPath)]
          )
        );
      }
    }

    // TODO: read service calls and add them as dependencies
    return explicitDependencies.filter(
      (dep) => !!dep && !EXCLUDED_PACKAGES.includes(dep.packageName)
    );
  }
}
