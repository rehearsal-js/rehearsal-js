import { Package, ProjectGraph, readPackageJson } from '@rehearsal/migration-graph-shared';
import {
  EmberAddonProjectGraph,
  EmberAppProjectGraph,
  getRootPackage,
  discoverEmberPackages,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import debug from 'debug';
import minimatch from 'minimatch';
import { SourceType } from './source-type';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph');

export type MigrationGraphOptions = {
  entrypoint?: string;
  filterByPackageName?: Array<string>;
};

function buildMigrationGraphForLibrary(
  m: ProjectGraph,
  options?: MigrationGraphOptions
): ProjectGraph {
  const rootDir = m.rootDir;
  const p = new Package(rootDir);

  m.graph.addNode({
    key: p.packageName,
    pkg: p,
    converted: p.isConvertedToTypescript(),
    modules: p.createModuleGraph({
      entrypoint: options?.entrypoint,
    }),
  });
  return m;
}

function buildMigrationGraphForEmber(
  m: ProjectGraph,
  options?: MigrationGraphOptions
): ProjectGraph {
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
): ProjectGraph {
  // Determine what kind of MigrationGraph should be created.
  // Library
  // Ember App
  // Ember Addon

  const packageJson = readPackageJson(rootDir);

  let projectGraph: ProjectGraph;

  if (isEmberAddon(packageJson)) {
    projectGraph = new EmberAddonProjectGraph(rootDir, SourceType.EmberAddon);
    projectGraph = buildMigrationGraphForEmber(projectGraph, options);
  } else if (isEmberApp(packageJson)) {
    projectGraph = new EmberAppProjectGraph(rootDir, SourceType.EmberApp);
    projectGraph = buildMigrationGraphForEmber(projectGraph, options);
  } else {
    projectGraph = new ProjectGraph(rootDir, SourceType.Library);
    projectGraph = buildMigrationGraphForLibrary(projectGraph, options);
  }

  return projectGraph;
}
