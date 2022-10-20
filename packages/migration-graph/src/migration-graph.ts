import { relative, resolve } from 'path';
import {
  EmberAddonPackage,
  EmberPackage,
  getInternalPackages,
  getRootPackage,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { Package, readPackageJson } from '@rehearsal/migration-graph-shared';
import debug from 'debug';
import { sync as fastGlobSync } from 'fast-glob';
import minimatch from 'minimatch';

import { createDependencyGraph as discoverModuleDependencyGraph } from './file-dependency-graph';
import { dfs } from './utils/dfs';
import { Graph } from './utils/graph';
import type { GraphNode } from './utils/graph-node';
import type { ModuleNode, PackageNode } from './types';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph');

const EXCLUDED_PACKAGES = ['test-harness'];

function isPackageConvertedToTypescript(
  pkg: Package,
  conversionLevel?: string,
  conversionExclusions?: string
): boolean {
  const fastGlobConfig = {
    absolute: true,
    cwd: pkg.path,
    ignore: ['**/node_modules/**'],
  };
  // ignore a tests directory if we only want to consider the source
  if (conversionLevel === 'source-only') {
    fastGlobConfig.ignore.push('**/tests/**');
  }

  // ignore some common .js files unless considering "full" conversion
  if (conversionLevel !== 'full') {
    fastGlobConfig.ignore.push(
      ...['.ember-cli.js', 'ember-cli-build.js', 'ember-config.js', 'index.js', 'testem.js']
    );
  }

  // add any custom exclusions to the list
  if (conversionExclusions) {
    fastGlobConfig.ignore.push(...conversionExclusions.split(','));
  }

  // if there's a tsconfig
  const hasTSConfig = fastGlobSync('tsconfig.json', fastGlobConfig);
  // if there aren't any .js files in addon (minus the ignore list)
  const hasJS = fastGlobSync('**/*.js', fastGlobConfig);

  if (!!hasTSConfig?.length && !hasJS?.length) {
    return true;
  }
  return false;
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
    const packageName = packageData.pkg.packageName;
    const duplicate = reportedNodes.has(packageName) ? 'DUPLICATE' : '';

    if (duplicate.length) {
      DEBUG_CALLBACK('Duplicate found');
      return;
    }

    const relativePath = relative(process.cwd(), packageData.pkg.path);
    const parentPkgName = someGraphNode.parent?.content?.pkg.packageName;

    let taskString = `${taskNumber++}. ${packageData.pkg.packageName} (./${relativePath})`;
    taskString = taskString.concat(` parent: ${parentPkgName}`);

    if (packageData.converted) {
      DEBUG_CALLBACK(`[X] DONE ${taskString}`);
    } else {
      DEBUG_CALLBACK(`[ ] TODO ${taskString}`);
    }

    reportedNodes.add(packageName);
  }
}

function discoverEmberPackages(rootDir: string): Array<Package | EmberPackage | EmberAddonPackage> {
  const { mappingsByAddonName } = getInternalPackages(rootDir);
  return Array.from(Object.values(mappingsByAddonName));
}

export type MigrationGraphOptions = {
  entrypoint?: string;
  filterByPackageName?: Array<string>;
};

export enum DetectedSource {
  EmberApp = 'Ember Application',
  EmberAddon = 'Ember Addon',
  Library = 'Javascript Library',
}

class MigrationGraph {
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

  addPackageToGraph(p: Package): void {
    DEBUG_CALLBACK(`\n------------------`);
    DEBUG_CALLBACK(`Package Name: ${p.packageName}`);
    DEBUG_CALLBACK(`Package Path: ${p.packagePath}`);

    const isConverted = isPackageConvertedToTypescript(p, 'source-only');

    let modules;

    if (!isConverted) {
      modules = discoverModuleDependencyGraph(
        p.path,
        {
          include: p.includePatterns,
          exclude: p.excludePatterns,
        },
        p
      );
    } else {
      modules = new Graph<ModuleNode>();
      DEBUG_CALLBACK('This package appears to be written in Typescript.');
    }

    const entry = this.#graph.addNode({
      key: p.packageName,
      pkg: p,
      converted: isConverted,
      modules,
    });

    this.buildAnalyzedPackageTree(entry);

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(entry));
  }

  buildAnalyzedPackageTree(currentNode: GraphNode<PackageNode>, depth = 1): void {
    const explicitDependencies = this.getExplicitPackageDependencies(currentNode.content.pkg);

    explicitDependencies.forEach((p: Package) => {
      const key = p.packageName;

      let depNode;

      if (!this.#graph.hasNode(key)) {
        // DEBUG_CALLBACK('buildAnalyzedPackagTree - addNode');
        depNode = this.#graph.addNode({
          key,
          pkg: p,
          converted: isPackageConvertedToTypescript(p),
          modules: discoverModuleDependencyGraph(
            p.path,
            {
              include: p.includePatterns,
              exclude: p.excludePatterns,
            },
            p
          ),
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

  getExplicitPackageDependencies(pkg: Package): Array<Package | EmberPackage | EmberAddonPackage> {
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
    if (pkg instanceof EmberPackage) {
      const emberPackage = pkg as EmberPackage;

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

function buildMigrationGraphForLibrary(
  m: MigrationGraph,
  options?: MigrationGraphOptions
): MigrationGraph {
  const rootDir = m.rootDir;
  const p = new Package(rootDir);

  m.graph.addNode({
    key: p.packageName,
    pkg: p,
    converted: isPackageConvertedToTypescript(p),
    modules: discoverModuleDependencyGraph(rootDir, {
      entrypoint: options?.entrypoint,
      include: p.includePatterns,
      exclude: p.excludePatterns,
    }),
  });
  return m;
}

function buildMigrationGraphForEmber(
  m: MigrationGraph,
  options?: MigrationGraphOptions
): MigrationGraph {
  const rootDir = m.rootDir;
  // Evaluate the directory to see if it has any internal packages e.g. in-repo-addon or in-repo-engines
  const packages = discoverEmberPackages(rootDir);

  // If there no packages, we dont' have to do much.
  if (packages && packages.length > 1) {
    DEBUG_CALLBACK(`Discovered ${packages.length} packages: `);

    let counter = 1;

    // loop through each package
    const filtered = packages.filter((p) => {
      const patterns = options?.filterByPackageName || [];

      if (patterns.length < 1) {
        return true;
      }

      const packageName = p.packageName;
      const isMatch = patterns.find(
        (pattern: string) => packageName && minimatch(packageName, pattern)
      );
      return !!isMatch;
    });

    // TOOD add to logging Verbose
    DEBUG_CALLBACK(`Total Filtered Packages: ${filtered.length}`);

    counter = 1;

    filtered.forEach((p) => DEBUG_CALLBACK(` ${counter++}. ${p.packageName}: ${p.path}`));
    filtered.forEach((p) => {
      m.addPackageToGraph(p);
    });
  } else {
    // Otherwise, it's just an ember-app or ember-addon with no internal addons or engines.
    const p = getRootPackage(rootDir);
    m.addPackageToGraph(p);
  }

  return m;
}

export function buildMigrationGraph(
  rootDir: string,
  options?: MigrationGraphOptions
): MigrationGraph {
  // Determine what kind of MigrationGraph should be created.
  // Ember App
  // Ember Addon
  // Library

  let m = new MigrationGraph(rootDir);

  switch (m.sourceType) {
    case DetectedSource.Library:
      m = buildMigrationGraphForLibrary(m, options);
      break;
    case DetectedSource.EmberApp:
    case DetectedSource.EmberAddon:
      m = buildMigrationGraphForEmber(m, options);
      break;
    default:
      throw new Error('Undetected source.');
      break;
  }

  return m;
}
