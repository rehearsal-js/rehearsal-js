import { EmberAddonPackage } from '@rehearsal/migration-graph-ember';
import { Package } from '@rehearsal/migration-graph-shared';
import debug from 'debug';
import {
  cruise,
  ICruiseOptions,
  ICruiseResult,
  IDependency,
  IModule,
  IReporterOutput,
  IResolveOptions,
} from 'dependency-cruiser';
import fs from 'fs';
import { join, relative, resolve } from 'path';

import { ModuleNode } from '../types';
import { Graph } from '../utils/graph';

const DEBUG_CALLBACK = debug('rehearsal:createDependencyGraph:cruiser');

import { CachedInputFileSystem } from 'enhanced-resolve';

export type DependencyGraphOptions = {
  entrypoint?: string;
  include: Array<string>;
  exclude: Array<string>;
};

function isExternalModule(moduleOrDep: IModule | IDependency): boolean {
  // If it's a coreModule like `path` skip;
  return (moduleOrDep.coreModule || moduleOrDep.couldNotResolve) ?? false;
}

function resolveRelative(baseDir: string, somePath: string): string {
  return relative(fs.realpathSync(baseDir), fs.realpathSync(join(baseDir, somePath)));
}

export function createDependencyGraph(
  baseDir: string,
  options?: DependencyGraphOptions,
  maybePackage?: Package
): Graph<ModuleNode> {
  const { include, exclude, entrypoint } = { include: ['index.js'], exclude: [], ...options };

  let resolveOptions = {} as IResolveOptions;

  // TODO move this into the ember-addon class
  if (maybePackage instanceof EmberAddonPackage) {
    const addonName = maybePackage.emberAddonName;

    const alias: Record<string, string> = {};
    alias[addonName] = resolve(baseDir, 'addon');

    resolveOptions = {
      fileSystem: new CachedInputFileSystem(fs, 4000),
      resolveDeprecations: false,
      alias: alias,
    };
  }

  const cruiseOptions: ICruiseOptions = {
    baseDir,
    exclude: {
      path: ['node_modules', ...exclude],
    },
  };

  let result: IReporterOutput;

  // TODO get entrypoint  Package (maybePckage) and instantiate with that value if provided from API.
  const target = entrypoint ? [entrypoint] : [...include];

  DEBUG_CALLBACK(target);

  try {
    result = cruise(target, cruiseOptions, resolveOptions);
  } catch (error) {
    throw new Error(`Unable to cruise: ${error}`);
  }

  const graph = new Graph<ModuleNode>();

  const output = result.output as ICruiseResult;

  output.modules.forEach((m: IModule) => {
    if (isExternalModule(m)) {
      return;
    }

    // IModule.source and IDependency.resolved paths from dependency-cruiser can
    // have awkward paths when using a tmpDir in MacOS resolveing the paths to the
    // baseDir helps ensure we always get a file path relative to the baseDir.

    const sourcePath = resolveRelative(baseDir, m.source);

    const source = graph.addNode({ key: sourcePath, path: sourcePath, meta: m });

    if (m.dependencies.length < 0) {
      return;
    }

    m.dependencies.forEach((d: IDependency) => {
      if (isExternalModule(d)) {
        return;
      }

      const relativePath = resolveRelative(baseDir, d.resolved);

      const dest = graph.addNode({ key: relativePath, path: relativePath, meta: d });
      graph.addEdge(source, dest);
    });
  });

  return graph;
}
