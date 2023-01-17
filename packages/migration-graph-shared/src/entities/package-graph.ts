import fs from 'fs';
import { join, relative } from 'path';
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
import { Graph, GraphNode } from '../graph';
import { Package } from './package';
import type { ModuleNode, PackageNode } from '../types';
import type { ProjectGraph } from './project-graph';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-shared:package-graph');

function isExternalModule(moduleOrDep: IModule | IDependency): boolean {
  // If it's a coreModule like `path` skip;
  return (moduleOrDep.coreModule || moduleOrDep.couldNotResolve) ?? false;
}

function resolveRelative(baseDir: string, somePath: string): string {
  return relative(fs.realpathSync(baseDir), fs.realpathSync(join(baseDir, somePath)));
}

export type PackageGraphOptions = {
  entrypoint?: string;
  parent?: GraphNode<PackageNode>;
  project?: ProjectGraph;
};

export class PackageGraph {
  protected baseDir: string;
  protected package: Package;
  protected entrypoint?: string;
  protected parentNode?: GraphNode<PackageNode>;
  protected projectGraph?: ProjectGraph;

  #graph: Graph<ModuleNode>;

  constructor(p: Package, options: PackageGraphOptions = {}) {
    this.package = p;
    this.baseDir = p.path;
    this.#graph = new Graph<ModuleNode>();
    this.entrypoint = options.entrypoint;
    this.parentNode = options.parent;
    this.projectGraph = options.project;
  }

  get graph(): Graph<ModuleNode> {
    return this.#graph;
  }

  discover(): Graph<ModuleNode> {
    const baseDir = this.baseDir;
    const entrypoint = this.entrypoint;

    const include = this.package.includePatterns
      ? Array.from(this.package.includePatterns)
      : ['index.js'];

    let exclude = this.package.excludePatterns ? Array.from(this.package.excludePatterns) : [];

    if (this.projectGraph) {
      // This should be moved to the Package constructor.
      const relativePackagePath = relative(this.projectGraph.rootDir, this.baseDir);
      const additionalExcludes: string[] = Array.from(this.projectGraph.exclude)
        .map((match) => relative(relativePackagePath, match))
        .filter((relativePath) => !relativePath.startsWith('..'));
      exclude = exclude.concat(additionalExcludes);
    }

    const cruiseOptions: ICruiseOptions = {
      baseDir,
      exclude: {
        path: ['node_modules', '\\.css$', ...exclude],
      },
    };

    let result: IReporterOutput;

    // TODO get entrypoint  Package (maybePckage) and instantiate with that value if provided from API.
    const target = entrypoint ? [entrypoint] : [...include];

    DEBUG_CALLBACK('Executing dependency-cruiser');
    DEBUG_CALLBACK('Target: %O', target);
    DEBUG_CALLBACK('Options: %O', cruiseOptions);

    try {
      result = cruise(target, cruiseOptions, this.resolveOptions);
    } catch (error) {
      throw new Error(`Unable to cruise: ${error}`);
    }

    DEBUG_CALLBACK(result);

    const output = result.output as ICruiseResult;

    output.modules.forEach((m: IModule) => {
      DEBUG_CALLBACK(m);

      if (isExternalModule(m)) {
        return;
      }

      // IModule.source and IDependency.resolved paths from dependency-cruiser can
      // have awkward paths when using a tmpDir in MacOS resolveing the paths to the
      // baseDir helps ensure we always get a file path relative to the baseDir.

      const sourcePath = resolveRelative(baseDir, m.source);

      if (this.isFileExternalToPackage(sourcePath)) {
        DEBUG_CALLBACK(
          `The target file "${sourcePath}" is external to package "${this.package.packageName}" (${baseDir}), omitting target file form package-graph.`
        );
        // Should resolve path completely relativeto the project and find which package it belongs to.
        // Ask project which package does this belong maybe create an edge?
        return;
      }

      // If a node exists we need to update it.

      const source = this.addNode({
        key: sourcePath,
        path: sourcePath,
      });

      if (m.dependencies.length < 0) {
        return;
      }

      m.dependencies.forEach((d: IDependency) => {
        if (isExternalModule(d)) {
          return;
        }

        const targetPath = resolveRelative(baseDir, d.resolved);
        const packageName = this.package.packageName;

        if (this.isFileExternalToPackage(targetPath)) {
          DEBUG_CALLBACK(
            `The source file "${sourcePath}" is importing a file "${targetPath}" that is external to "${packageName}" package directory (${baseDir}), omitting target file ("${targetPath}") form package-graph.`
          );
          // TODO Should resolve this path to a package in the project?
          // Potential issues could be circulars within the project.
          return;
        }

        const dest = this.addNode({ key: targetPath, path: targetPath });

        this.#graph.addEdge(source, dest);
      });
    });

    return this.#graph;
  }

  isFileExternalToPackage(relativePath: string): boolean {
    return relativePath.startsWith('..');
  }

  get resolveOptions(): IResolveOptions {
    return {} as IResolveOptions;
  }

  addNode(m: ModuleNode): GraphNode<ModuleNode> {
    return this.#graph.addNode(m);
  }
}
