import { dirname } from 'path';
import debug from 'debug';
import { sync as fastGlobSync } from 'fast-glob';
import { Graph, GraphNode } from '../graph';
import { isWorkspace } from '../../src/utils/workspace';
import { RootPackage } from './root-package';
import { Package } from './package';

import type { PackageNode } from '../types';
import { VoidPackage } from './void-package';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-shared:project-graph');

// TODO this package level dependency data should be surfaced in a report

export type ProjectGraphOptions = {
  eager?: boolean;
  sourceType?: string;
  entrypoint?: string;
  include?: Array<string>;
  exclude?: Array<string>;
};

export class ProjectGraph {
  #rootDir: string;
  #graph: Graph<PackageNode>;
  #sourceType: string;
  #eager: boolean;

  protected entrypoint: string | undefined;
  protected discoveredPackages: Record<string, Package>;
  protected visited: Set<Package>;

  include: Set<string>;
  exclude: Set<string>;

  constructor(rootDir: string, options?: ProjectGraphOptions) {
    const { eager, sourceType, entrypoint, exclude, include } = {
      eager: false,
      sourceType: 'JavaScript Library',
      ...options,
    };

    this.include = new Set(include);
    this.exclude = new Set(exclude);
    this.#rootDir = rootDir;
    this.entrypoint = entrypoint;
    this.#eager = eager;
    this.#sourceType = sourceType;
    this.#graph = new Graph<PackageNode>();
    this.visited = new Set<Package>();
    this.discoveredPackages = {};
  }

  get rootDir(): string {
    return this.#rootDir;
  }

  get graph(): Graph<PackageNode> {
    return this.#graph;
  }

  get sourceType(): string {
    return this.#sourceType;
  }

  addPackageToGraph(p: Package, crawl = true): GraphNode<PackageNode> {
    DEBUG_CALLBACK('addPackageToGraph: name: %s, path: %s', p.packageName, p.path);

    const isConverted = p.isConvertedToTypescript('source-only');

    const contents = {
      key: p.packageName,
      pkg: p,
      converted: isConverted,
    };

    const node: GraphNode<PackageNode> = this.#graph.hasNode(p.packageName)
      ? this.#graph.updateNode(p.packageName, contents)
      : this.#graph.addNode(contents);

    if (this.#eager) {
      p.getModuleGraph({ parent: node, project: this });
    }

    if (isConverted) {
      DEBUG_CALLBACK('Package %s appears to been migrated to Typescript.', p.packageName);
    }

    // Find in-project dependnecies/devDepenencies
    if (crawl) {
      this.discoverEdgesFromDependencies(node);
    }

    return node;
  }

  hasDiscoveredEdges(pkg: Package): boolean {
    return this.visited.has(pkg);
  }

  discoverEdgesFromDependencies(source: GraphNode<PackageNode>): void {
    const pkg = source?.content?.pkg;

    if (!pkg) {
      throw new Error('Unable to discoverEdgesFromDependencies; node has no package defined.');
    }

    if (this.hasDiscoveredEdges(pkg)) {
      DEBUG_CALLBACK('Already processed "%s". Skip.', pkg.packageName);
      return;
    }

    const explicitDependencies = this.findInternalPackageDependencies(pkg);

    this.visited.add(pkg);

    DEBUG_CALLBACK(
      '"%s" depends on: %O',
      pkg.packageName,
      explicitDependencies.map((p) => p.packageName)
    );

    explicitDependencies.forEach((p: Package) => {
      const dest = this.addPackageToGraph(p);
      DEBUG_CALLBACK('Adding edge from "%s" to "%s"', source.content.key, dest.content.key);
      this.graph.addEdge(source, dest);
    });
  }

  findInternalPackageDependencies(pkg: Package): Array<Package> {
    let deps: Array<Package> = [];

    if (pkg.dependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies)
        .filter((depName) => !!this.discoveredPackages[depName])
        .map((depName) => this.discoveredPackages[depName]);
      deps = deps.concat(...somePackages);
    }

    if (pkg.devDependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.devDependencies)
        .filter((depName) => !!this.discoveredPackages[depName])
        .map((depName) => this.discoveredPackages[depName]);
      deps = deps.concat(...somePackages);
    }

    if (deps) {
      DEBUG_CALLBACK(
        'Found explicit depedencies for %s: %s',
        pkg.packageName,
        deps.map((p) => p.packageName)
      );
    }

    return deps;
  }

  protected discoveryByEntrypoint(entrypoint: string): VoidPackage {
    // Create an adhoc package to make sure things work, but ignore the rest.
    const p = new VoidPackage(this.#rootDir);
    p.includePatterns = new Set([entrypoint]);
    this.addPackageToGraph(p, false);
    return p;
  }

  discover(): Array<Package> {
    // If an entrypoint is defined, we forgo any package discovery logic,
    // and create a stub.
    if (this.entrypoint) {
      return [this.discoveryByEntrypoint(this.entrypoint)];
    }

    // Setup package and return

    // Add root package to graph
    const rootPackage = new RootPackage(this.rootDir);

    rootPackage.addExcludePattern(...this.exclude);
    rootPackage.addIncludePattern(...this.include);

    DEBUG_CALLBACK('RootPackage.excludePatterns', rootPackage.excludePatterns);
    DEBUG_CALLBACK('RootPackage.includePatterns', rootPackage.includePatterns);

    const rootPackageNode = this.addPackageToGraph(rootPackage, false);

    const globs = rootPackage.globs;

    if (globs.length <= 0) {
      return [rootPackage];
    }

    DEBUG_CALLBACK('ProjectGraph.globs %s', globs);

    const pathToRoot = this.rootDir;
    const cwd = this.rootDir;

    let pathToPackageJsonList = fastGlobSync(
      [
        ...globs.map((glob) => `${glob}/package.json`),
        `!${pathToRoot}/**/build/**`,
        `!${pathToRoot}/**/dist/**`,
        `!${pathToRoot}/**/node_modules/**`,
        `!${pathToRoot}/**/tmp/**`,
      ],
      {
        absolute: true,
        cwd,
      }
    );

    DEBUG_CALLBACK('found packages: %s', pathToPackageJsonList);

    pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) => dirname(pathToPackage));

    const entities = pathToPackageJsonList
      .filter((pathToPackage) => isWorkspace(this.rootDir, pathToPackage)) // Ensures any package found is in the workspace.
      .map((pathToPackage) => new Package(pathToPackage));

    this.discoveredPackages = entities.reduce((acc: Record<string, Package>, pkg: Package) => {
      acc[pkg.packageName] = pkg;
      return acc;
    }, {});

    entities.forEach((p) => {
      const destNode = this.addPackageToGraph(p);
      this.graph.addEdge(rootPackageNode, destNode);
    });

    return entities;
  }
}
