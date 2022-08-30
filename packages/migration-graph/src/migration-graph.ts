import { relative, resolve } from 'path';
import { sync } from 'fast-glob';
import { getInternalPackages } from '@rehearsal/migration-graph-ember';
import debug from 'debug';

import { Graph } from './utils/graph';
import { GraphNode } from './utils/graph-node';

import type { Package, PackageNode } from './types';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph');
const ROOT_PATH = process.cwd();

const EXCLUDED_PACKAGES = ['test-harness'];

function getExplicitPackageDependencies(pkg: Package): Package[] {
  const { mappingsByAddonName, mappingsByLocation } = getInternalPackages(ROOT_PATH);

  let explicitDependencies: Package[] = [];

  if (pkg.dependencies) {
    explicitDependencies = explicitDependencies.concat(
      ...(Object.keys(pkg.dependencies)?.map((depName) => mappingsByAddonName[depName]) ?? [])
    );
  }

  if (pkg.devDependencies) {
    explicitDependencies = explicitDependencies.concat(
      ...(Object.keys(pkg.devDependencies)?.map((devDepName) => mappingsByAddonName[devDepName]) ??
        [])
    );
  }

  if (pkg?.addonPaths?.length) {
    // get the package by location
    explicitDependencies = explicitDependencies.concat(
      pkg.addonPaths.map((addonPath) => mappingsByLocation[resolve(pkg.path, addonPath)])
    );
  }

  // TODO: read service calls and add them as dependencies
  return explicitDependencies.filter((dep) => !!dep && !EXCLUDED_PACKAGES.includes(dep.name));
}

function analyzeTypescriptConversionForPackage(
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
  const hasTSConfig = sync('tsconfig.json', fastGlobConfig);
  // if there aren't any .js files in addon (minus the ignore list)
  const hasJS = sync('**/*.js', fastGlobConfig);

  if (!!hasTSConfig?.length && !hasJS?.length) {
    return true;
  }
  return false;
}

function buildAnalyzedPackageTree(
  currentNode: GraphNode<PackageNode>,
  graph: Graph<PackageNode>,
  depth = 1
): Graph<PackageNode> {
  const explicitDependencies = getExplicitPackageDependencies(currentNode.content.pkg);

  explicitDependencies.forEach((pkgDep) => {
    const depNode = graph.addNode({
      key: pkgDep.path,
      pkg: pkgDep,
      converted: analyzeTypescriptConversionForPackage(pkgDep),
    });

    graph.addEdge(currentNode, depNode);

    buildAnalyzedPackageTree(depNode, graph, depth + 1);
  });

  return graph;
}

function debugAnalysis(graph: Graph<PackageNode>): void {
  const sortedNodes: GraphNode<PackageNode>[] = graph.topSort();
  const reportedNodes: Set<string> = new Set();

  let taskNumber = 1;

  sortedNodes.forEach((node) => {
    const packageData = node.content;
    const packageName = packageData.pkg.name;
    const duplicate = reportedNodes.has(packageName) ? 'DUPLICATE' : '';

    if (duplicate.length) {
      return;
    }

    const relativePath = relative(process.cwd(), packageData.pkg.path);
    const parentPkgName = node.parent?.content?.pkg.name;

    let taskString = `${taskNumber++}. ${packageData.pkg.name} (./${relativePath})`;
    taskString = taskString.concat(` parent: ${parentPkgName}`);

    if (packageData.converted) {
      console.log(`DONE ${taskString}`);
    } else {
      console.log(`TODO ${taskString}`);
    }

    reportedNodes.add(packageName);
  });
}

// EMBER SPECIFIC
async function getPaths(path: string): Promise<Package[]> {
  const { mappingsByAddonName } = getInternalPackages(ROOT_PATH);

  return Promise.resolve(path.split(',').map((addonName) => mappingsByAddonName[addonName]) || []);
}

export async function getMigrationGraph(path: string): Promise<void> {
  const packages = await getPaths(path);
  // loop through each package
  const graph = new Graph<PackageNode>();

  packages.forEach((pkg) => {
    const entry = graph.addNode({
      key: pkg.path,
      pkg,
      converted: analyzeTypescriptConversionForPackage(pkg),
    });

    const analyzedTree = buildAnalyzedPackageTree(entry, graph);

    DEBUG_CALLBACK('debugAnalysis', debugAnalysis(analyzedTree));
  });
}
