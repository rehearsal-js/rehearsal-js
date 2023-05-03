import { dirname, resolve } from 'node:path';
import debug, { type Debugger } from 'debug';
import fastGlob from 'fast-glob';
import { Graph, GraphNode } from '../graph/index.js';
import { isWorkspace } from '../../src/utils/workspace.js';
import { Package } from './package.js';
import type { PackageNode } from '../types.js';

// TODO this package level dependency data should be surfaced in a report

export type ProjectGraphOptions = {
  basePath: string;
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

  private basePath: string;

  protected entrypoint: string | undefined;
  protected discoveredPackages: Map<string, Package> = new Map();
  protected visited: Set<Package>;

  debug: Debugger = debug(`rehearsal:migration-graph-shared:${this.constructor.name}`);
  include: Set<string>;
  exclude: Set<string>;

  constructor(rootDir: string, options?: ProjectGraphOptions) {
    const { eager, sourceType, entrypoint, exclude, include } = {
      eager: false,
      sourceType: 'JavaScript Library',
      ...options,
    };
    this.debug(`rootDir: %s, options: %o`, rootDir, options);

    this.include = new Set(include);
    this.exclude = new Set(exclude);
    this.#rootDir = rootDir;
    this.entrypoint = entrypoint;
    this.#eager = eager;
    this.basePath = options?.basePath || process.cwd();
    this.#sourceType = sourceType;
    this.#graph = new Graph<PackageNode>();
    this.visited = new Set<Package>();
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
    this.debug('addPackageToGraph: name: %s, path: %s', p.packageName, p.path);

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
      this.debug('Package %s appears to been migrated to Typescript.', p.packageName);
    }

    // Find in-project dependencies/devDependencies
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
      this.debug('Already processed "%s". Skip.', pkg.packageName);
      return;
    }

    const explicitDependencies = this.findInternalPackageDependencies(pkg);

    this.visited.add(pkg);

    this.debug(
      '"%s" depends on: %O',
      pkg.packageName,
      explicitDependencies.map((p) => p.packageName)
    );

    explicitDependencies.forEach((p: Package) => {
      const dest = this.addPackageToGraph(p);
      this.debug('Adding edge from "%s" to "%s"', source.content.key, dest.content.key);
      this.graph.addEdge(source, dest);
    });
  }

  findInternalPackageDependencies(pkg: Package): Array<Package> {
    let deps: Array<Package> = [];

    if (pkg.dependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies)
        .filter((depName) => this.discoveredPackages.has(depName))
        .map((depName) => this.discoveredPackages.get(depName))
        .filter(onlyPackages);
      deps = deps.concat(...somePackages);
    }

    if (pkg.devDependencies) {
      const somePackages: Array<Package> = Object.keys(pkg.devDependencies)
        .filter((depName) => this.discoveredPackages.has(depName))
        .map((depName) => this.discoveredPackages.get(depName))
        .filter(onlyPackages);
      deps = deps.concat(...somePackages);
    }

    if (deps) {
      this.debug(
        'Found explicit dependencies for %s: %s',
        pkg.packageName,
        deps.map((p) => p.packageName)
      );
    }

    return deps;
  }

  protected discoveryByEntrypoint(entrypoint: string): Package {
    // Create an adhoc package to make sure things work, but ignore the rest.
    const p = new Package(this.#rootDir, { excludeWorkspaces: false });
    p.includePatterns = new Set([entrypoint]);
    this.addPackageToGraph(p, false);
    return p;
  }

  isRootPackage(somePackage: Package): boolean {
    return resolve(this.rootDir) === resolve(somePackage.path);
  }

  discover(): Array<Package> {
    // If an entrypoint is defined, we forgo any package discovery logic,
    // and create a stub.
    if (this.entrypoint) {
      return [this.discoveryByEntrypoint(this.entrypoint)];
    }

    if (this.basePath !== resolve(this.basePath, this.rootDir)) {
      const projectRoot = new Package(this.basePath);

      if (projectRoot.workspaceGlobs) {
        let pathToPackageJsonList = fastGlob.sync(
          [
            ...projectRoot.workspaceGlobs.map((glob) => `${glob}/package.json`),
            `!${this.basePath}/**/build/**`,
            `!${this.basePath}/**/dist/**`,
            `!${this.basePath}/**/node_modules/**`,
            `!${this.basePath}/**/tmp/**`,
          ],
          {
            absolute: true,
          }
        );

        this.debug('found packages: %s', pathToPackageJsonList);

        pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) =>
          dirname(pathToPackage)
        );

        const entities = pathToPackageJsonList
          .filter(
            (pathToPackage) =>
              !projectRoot.workspaceGlobs || isWorkspace(this.basePath, pathToPackage)
          ) // Ensures any package found is in the workspace.
          .map((pathToPackage) => new Package(pathToPackage));

        for (const pkg of entities) {
          if (!this.discoveredPackages.has(pkg.packageName)) {
            this.discoveredPackages.set(pkg.packageName, pkg);
          }
        }
      }
    }

    // Setup package and return

    // Add root package to graph
    const rootPackage = new Package(this.rootDir);

    rootPackage.addExcludePattern(...this.exclude);
    rootPackage.addIncludePattern(...this.include);

    this.debug('RootPackage.excludePatterns', rootPackage.excludePatterns);
    this.debug('RootPackage.includePatterns', rootPackage.includePatterns);

    const rootPackageNode = this.addPackageToGraph(rootPackage, true);

    const globs = rootPackage.workspaceGlobs;

    if (globs.length <= 0) {
      return [rootPackage];
    }

    this.debug('ProjectGraph.globs %s', globs);

    const pathToRoot = this.rootDir;
    const cwd = this.rootDir;

    let pathToPackageJsonList = fastGlob.sync(
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

    this.debug('found packages: %s', pathToPackageJsonList);

    pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) => dirname(pathToPackage));

    const entities = pathToPackageJsonList
      .filter(
        (pathToPackage) => !rootPackage.workspaceGlobs || isWorkspace(this.rootDir, pathToPackage)
      ) // Ensures any package found is in the workspace.
      .map((pathToPackage) => new Package(pathToPackage));

    for (const pkg of entities) {
      if (!this.discoveredPackages.has(pkg.packageName)) {
        this.discoveredPackages.set(pkg.packageName, pkg);
      }
    }

    entities.forEach((p) => {
      const destNode = this.addPackageToGraph(p);
      this.graph.addEdge(rootPackageNode, destNode);
    });

    return entities;
  }
}

function onlyPackages(entry: Package | undefined): entry is Package {
  return entry !== undefined;
}
