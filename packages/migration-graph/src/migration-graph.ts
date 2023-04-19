import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { ProjectGraph, ProjectGraphOptions } from '@rehearsal/migration-graph-shared';
import {
  EmberAddonPackageGraphOptions,
  EmberAddonProjectGraph,
  EmberAppProjectGraphOptions,
  EmberAppProjectGraph,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { SourceType } from './source-type.js';
import type { PackageJson } from 'type-fest';

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

  if (!existsSync(resolve(rootDir, 'package.json'))) {
    throw new Error(
      `A 'package.json' is to be expected in the root of '${rootDir}', but one was not found.`
    );
  }

  const packageJson = JSON.parse(
    readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
  ) as PackageJson;

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
