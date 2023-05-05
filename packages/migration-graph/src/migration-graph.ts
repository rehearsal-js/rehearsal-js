import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  DiscoverOptions,
  ProjectGraph,
  ProjectGraphOptions,
} from '@rehearsal/migration-graph-shared';
import {
  EmberAddonProjectGraph,
  EmberAppProjectGraph,
  isEmberAddon,
  isEmberApp,
} from '@rehearsal/migration-graph-ember';
import { SourceType } from './source-type.js';
import type { PackageJson } from 'type-fest';

export type MigrationGraphOptions = ProjectGraphOptions & DiscoverOptions;

export function buildMigrationGraph(
  basePath = process.cwd(),
  srcDir: string,
  options: MigrationGraphOptions
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
    projectGraph = new EmberAddonProjectGraph(srcDir, { ...options, basePath });
  } else if (isEmberApp(packageJson)) {
    sourceType = SourceType.EmberApp;
    projectGraph = new EmberAppProjectGraph(srcDir, { ...options, basePath });
  } else {
    sourceType = SourceType.Library;
    projectGraph = new ProjectGraph(srcDir, { ...options, basePath });
  }

  const { crawlDeps, crawlDevDeps, include, exclude, ignoredPackages } = options;

  projectGraph.discover({
    crawlDeps,
    crawlDevDeps,
    include,
    exclude,
    ignoredPackages,
  });

  return { projectGraph, sourceType };
}
