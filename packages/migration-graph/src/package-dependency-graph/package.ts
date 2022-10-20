import fs from 'fs';
import { join, relative } from 'path';
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
import { ModuleNode } from '../types';
import { Graph } from '../utils/graph';
import { GraphNode } from '../utils/graph-node';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph:PackageDependencyGraph');

function isExternalModule(moduleOrDep: IModule | IDependency): boolean {
  // If it's a coreModule like `path` skip;
  return (moduleOrDep.coreModule || moduleOrDep.couldNotResolve) ?? false;
}

function resolveRelative(baseDir: string, somePath: string): string {
  return relative(fs.realpathSync(baseDir), fs.realpathSync(join(baseDir, somePath)));
}

export type PackageDependencyGraphOptions = {
  entrypoint?: string;
};

export class PackageDependencyGraph {
  protected options: PackageDependencyGraphOptions;
  protected baseDir: string;
  protected graph: Graph<ModuleNode>;
  protected package: Package;

  constructor(p: Package, options: PackageDependencyGraphOptions = {}) {
    this.package = p;
    this.baseDir = p.path;
    this.options = options || {};
    this.graph = new Graph<ModuleNode>();
  }

  getGraph(): Graph<ModuleNode> {
    return this.graph;
  }

  discover(): Graph<ModuleNode> {
    const baseDir = this.baseDir;
    const { entrypoint } = {
      ...this.options,
    };

    const include = this.package.includePatterns || ['index.js'];
    const exclude = this.package.excludePatterns || [];

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

    // console.log(target);

    // console.log('GOING TO CRUISE');

    // console.log(cruiseOptions);

    try {
      result = cruise(target, cruiseOptions, this.resolveOptions);
    } catch (error) {
      throw new Error(`Unable to cruise: ${error}`);
    }

    // console.log(result);

    const output = result.output as ICruiseResult;

    output.modules.forEach((m: IModule) => {
      if (isExternalModule(m)) {
        return;
      }

      // IModule.source and IDependency.resolved paths from dependency-cruiser can
      // have awkward paths when using a tmpDir in MacOS resolveing the paths to the
      // baseDir helps ensure we always get a file path relative to the baseDir.

      const sourcePath = resolveRelative(baseDir, m.source);

      // If a node exists we need to update it.

      const source = this.addNode({
        key: sourcePath,
        path: sourcePath,
        meta: m,
      });

      if (m.dependencies.length < 0) {
        return;
      }

      m.dependencies.forEach((d: IDependency) => {
        if (isExternalModule(d)) {
          return;
        }

        const relativePath = resolveRelative(baseDir, d.resolved);

        // console.log(relativePath)
        const dest = this.addNode({ key: relativePath, path: relativePath, meta: d });

        this.graph.addEdge(source, dest);
      });
    });

    return this.graph;
  }

  get resolveOptions(): IResolveOptions {
    return {} as IResolveOptions;
  }

  addNode(m: ModuleNode): GraphNode<ModuleNode> {
    return this.graph.addNode(m);
  }
}
