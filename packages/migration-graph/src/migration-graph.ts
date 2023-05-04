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
  basePath = process.cwd(),
  srcDir: string,
  options: MigrationGraphOptions & { deps: boolean; devDeps: boolean; ignore: string[] }
): { projectGraph: ProjectGraph; sourceType: SourceType } {
  if (!existsSync(resolve(srcDir, 'package.json'))) {
    throw new Error(
      `A 'package.json' is to be expected in the root of '${srcDir}', but one was not found.`
    );
  }

  const packageJson = JSON.parse(
    readFileSync(resolve(srcDir, 'package.json'), 'utf-8')
  ) as PackageJson;

  let projectGraph: ProjectGraph | EmberAppProjectGraph | EmberAddonProjectGraph;
  let sourceType: SourceType;

  if (isEmberAddon(packageJson)) {
    sourceType = SourceType.EmberAddon;
    projectGraph = new EmberAddonProjectGraph(srcDir, { sourceType, ...options, basePath });
  } else if (isEmberApp(packageJson)) {
    sourceType = SourceType.EmberApp;
    projectGraph = new EmberAppProjectGraph(srcDir, { sourceType, ...options, basePath });
  } else {
    sourceType = SourceType.Library;
    projectGraph = new ProjectGraph(srcDir, { sourceType, ...options, basePath });
  }

  projectGraph.discover(options.deps, options.devDeps, options.ignore);

  return { projectGraph, sourceType };
}
