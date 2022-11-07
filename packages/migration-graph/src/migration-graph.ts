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
  m: EmberAppProjectGraph | EmberAddonProjectGraph,
  options?: MigrationGraphOptions
): EmberAppProjectGraph | EmberAddonProjectGraph {
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
): { projectGraph: ProjectGraph; sourceType: SourceType } {
  // Determine what kind of MigrationGraph should be created.
  // Library
  // Ember App
  // Ember Addon

  const packageJson = readPackageJson(rootDir);

  let projectGraph: ProjectGraph | EmberAppProjectGraph | EmberAddonProjectGraph;
  let sourceType: SourceType;

  if (isEmberAddon(packageJson)) {
    sourceType = SourceType.EmberAddon;
    projectGraph = buildMigrationGraphForEmber(
      new EmberAddonProjectGraph(rootDir, SourceType.EmberAddon),
      options
    );
  } else if (isEmberApp(packageJson)) {
    sourceType = SourceType.EmberApp;
    projectGraph = buildMigrationGraphForEmber(
      new EmberAppProjectGraph(rootDir, sourceType),
      options
    );
  } else {
    sourceType = SourceType.Library;
    projectGraph = buildMigrationGraphForLibrary(new ProjectGraph(rootDir, sourceType), options);
  }

  return { projectGraph, sourceType };
}
