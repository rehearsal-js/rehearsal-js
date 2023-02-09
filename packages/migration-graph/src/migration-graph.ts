import {
  ProjectGraph,
  ProjectGraphOptions,
  readPackageJson,
} from '@rehearsal/migration-graph-shared';
import {
  EmberAddonPackageGraphOptions,
  EmberAddonProjectGraph,
  EmberAppProjectGraphOptions,
  EmberAppProjectGraph,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { SourceType } from './source-type';

export type MigrationGraphOptions =
  | ProjectGraphOptions
  | EmberAppProjectGraphOptions
  | EmberAddonPackageGraphOptions;

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
    projectGraph = new EmberAddonProjectGraph(rootDir, { sourceType, ...options });
  } else if (isEmberApp(packageJson)) {
    sourceType = SourceType.EmberApp;
    projectGraph = new EmberAppProjectGraph(rootDir, { sourceType, ...options });
  } else {
    sourceType = SourceType.Library;
    projectGraph = new ProjectGraph(rootDir, { sourceType, ...options });
  }

  projectGraph.discover();

  return { projectGraph, sourceType };
}
