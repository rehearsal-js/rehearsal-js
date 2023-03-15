import { resolve } from 'node:path';
import { PackageJson, ProjectGraph, ProjectGraphOptions } from '@rehearsal/migration-graph-shared';
import {
  EmberAddonPackageGraphOptions,
  EmberAddonProjectGraph,
  EmberAppProjectGraphOptions,
  EmberAppProjectGraph,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { readJsonSync } from 'fs-extra/esm';
import { SourceType } from './source-type.js';

export type MigrationGraphOptions =
  | ProjectGraphOptions
  | EmberAppProjectGraphOptions
  | EmberAddonPackageGraphOptions;

export function buildMigrationGraph(
  rootDir: string,
  options?: MigrationGraphOptions
): { projectGraph: ProjectGraph; sourceType: SourceType } {
  // Determine what kind of MigrationGraph should be created.
  // Ember App
  // Ember Addon
  // Library

  const packageJson = readJsonSync(resolve(rootDir, 'package.json')) as PackageJson;

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
