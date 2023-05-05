import { dirname, join, resolve } from 'node:path';
import debug, { type Debugger } from 'debug';
import fastGlob from 'fast-glob';
import { Graph, GraphNode } from '../graph/index.js';
import { isWorkspace } from '../../src/utils/workspace.js';
import { Package } from './package.js';
import type { PackageNode } from '../types.js';
import FastGlob from 'fast-glob';
import { getExcludePatterns } from '../index.js';

// TODO this package level dependency data should be surfaced in a report

export type DiscoverOptions = {
  ignoredGlobs: string[];
  crawlDeps: boolean;
  crawlDevDeps: boolean;
  include: string[];
  exclude: string[];
};

export type ProjectGraphOptions = {
  basePath: string;
  eager?: boolean;

  // Only used by Project classes
  entrypoint?: string;
};

export class ProjectGraph {
  #rootDir: string;
  #graph: Graph<PackageNode>;
  #sourceType: string;
  #eager: boolean;

  basePath: string;

  protected entrypoint: string | undefined;
  protected discoveredPackages: Map<string, Package> = new Map();
  protected visited: Set<Package>;

  debug: Debugger = debug(`rehearsal:migration-graph-shared:${this.constructor.name}`);

  constructor(srcDir: string, options: ProjectGraphOptions) {
    const { eager, sourceType, entrypoint } = {
      eager: false,
      sourceType: 'JavaScript Library',
      ...options,
    };

    this.debug(`srcDir: %s, options: %o`, srcDir, options);

    this.#rootDir = srcDir;
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

  addPackageToGraph(
    p: Package,
    crawlModules = true,
    crawlDeps: boolean,
    crawlDevDeps: boolean
  ): GraphNode<PackageNode> {
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
      p.getModuleGraph({ parent: node, project: this, basePath: this.basePath });
    }

    if (isConverted) {
      this.debug('Package %s appears to been migrated to Typescript.', p.packageName);
    }

    // Find in-project dependencies/devDependencies
    if (crawlModules) {
      this.discoverEdgesFromDependencies(node, crawlDeps, crawlDevDeps);
    }

    return node;
  }

  hasDiscoveredEdges(pkg: Package): boolean {
    return this.visited.has(pkg);
  }

  discoverEdgesFromDependencies(
    source: GraphNode<PackageNode>,
    crawlDeps: boolean,
    crawlDevDeps: boolean
  ): void {
    const pkg = source?.content?.pkg;

    if (!pkg) {
      throw new Error('Unable to discoverEdgesFromDependencies; node has no package defined.');
    }

    if (this.hasDiscoveredEdges(pkg)) {
      this.debug('Already processed "%s". Skip.', pkg.packageName);
      return;
    }

    const explicitDependencies = this.findInternalPackageDependencies(pkg, crawlDeps, crawlDevDeps);

    this.visited.add(pkg);

    this.debug(
      '"%s" depends on: %O',
      pkg.packageName,
      explicitDependencies.map((p) => p.packageName)
    );

    explicitDependencies.forEach((p: Package) => {
      const dest = this.addPackageToGraph(p, true, crawlDeps, crawlDevDeps);
      this.debug('Adding edge from "%s" to "%s"', source.content.key, dest.content.key);
      this.graph.addEdge(source, dest);
    });
  }

  findInternalPackageDependencies(
    pkg: Package,
    crawlDeps: boolean,
    crawlDevDeps: boolean
  ): Array<Package> {
    let deps: Array<Package> = [];

    if (pkg.dependencies && crawlDeps) {
      const somePackages: Array<Package> = Object.keys(pkg.dependencies)
        .filter((depName) => this.discoveredPackages.has(depName))
        .map((depName) => this.discoveredPackages.get(depName))
        .filter(onlyPackages);
      deps = deps.concat(...somePackages);
    }

    if (pkg.devDependencies && crawlDevDeps) {
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
    this.addPackageToGraph(p, false, true, true);
    return p;
  }

  isRootPackage(somePackage: Package): boolean {
    return resolve(this.rootDir) === resolve(somePackage.path);
  }

  /**
   * To allow entering the package graph at any node in the graph
   * we must first look for and build any packages that may be part
   * of a workspace. In doing so we generate the observable set of
   * packages any given node in the graph may reference in code and
   * it's package.json
   */
  protected discoverWorkspacePackages(
    ignorePackages: string[] = [],
    ignoredPaths: string[] = []
  ): void {
    const projectRoot = new Package(this.basePath, { ignoreGlobs: ignoredPaths });

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

      pathToPackageJsonList = pathToPackageJsonList.map((pathToPackage) => dirname(pathToPackage));

      const entities = pathToPackageJsonList
        .filter(
          (pathToPackage) =>
            !projectRoot.workspaceGlobs || isWorkspace(this.basePath, pathToPackage)
        ) // Ensures any package found is in the workspace.
        .map((pathToPackage) => new Package(pathToPackage, { ignoreGlobs: ignoredPaths }));

      for (const pkg of entities) {
        if (
          !this.discoveredPackages.has(pkg.packageName) &&
          !ignorePackages.includes(pkg.packageName)
        ) {
          this.discoveredPackages.set(pkg.packageName, pkg);
        }
      }
    }
  }

  discover(options: DiscoverOptions): Array<Package> {
    const { ignoredGlobs, crawlDeps, crawlDevDeps, include, exclude } = options;
    // If an entrypoint is defined, we forgo any package discovery logic,
    // and create a stub.
    if (this.entrypoint) {
      return [this.discoveryByEntrypoint(this.entrypoint)];
    }

    const ignoredPaths = options.ignoredGlobs
      .flatMap((glob) => {
        return FastGlob.sync(glob, { cwd: this.basePath, ignore: getExcludePatterns() });
      })
      .map((filePath) => join(this.basePath, filePath));

    // *IMPORTANT* this must be called to populate `discoveredPackages`
    this.discoverWorkspacePackages(ignoredGlobs, ignoredPaths);

    // Setup package and return

    // Add root package to graph
    const rootPackage = new Package(this.rootDir, { ignoreGlobs: ignoredPaths });

    rootPackage.addExcludePattern(...exclude);
    rootPackage.addIncludePattern(...include);

    this.debug('RootPackage.excludePatterns', rootPackage.excludePatterns);
    this.debug('RootPackage.includePatterns', rootPackage.includePatterns);

    const rootPackageNode = this.addPackageToGraph(rootPackage, true, crawlDeps, crawlDevDeps);

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
      .map((pathToPackage) => new Package(pathToPackage, { ignoreGlobs: ignoredPaths }));

    for (const pkg of entities) {
      if (!this.discoveredPackages.has(pkg.packageName)) {
        this.discoveredPackages.set(pkg.packageName, pkg);
      }
    }

    entities.forEach((p) => {
      const destNode = this.addPackageToGraph(p, true, crawlDeps, crawlDevDeps);
      this.graph.addEdge(rootPackageNode, destNode);
    });

    return entities;
  }
}

function onlyPackages(entry: Package | undefined): entry is Package {
  return entry !== undefined;
}
