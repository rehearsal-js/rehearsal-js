import { realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import debug, { type Debugger } from 'debug';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { cruise } from 'dependency-cruiser';
import { Graph, GraphNode } from '../graph/index.js';
import { Package } from './package.js';
import type { ModuleNode, PackageNode } from '../types.js';
import type { ProjectGraph } from './project-graph.js';
import type {
  ICruiseOptions,
  ICruiseResult,
  IDependency,
  IModule,
  IReporterOutput,
  IResolveOptions,
} from '../../types/dependency-cruiser/index.js';

const EXCLUDE_FILE_EXTS = ['\\.css$', '\\.json$', '\\.graphql$'];

function isExternalModule(moduleOrDep: IModule | IDependency): boolean {
  // If it's a coreModule like `path` skip;
  return (moduleOrDep.coreModule || moduleOrDep.couldNotResolve) ?? false;
}

function resolveRelative(baseDir: string, somePath: string): string {
  return relative(realpathSync(baseDir), realpathSync(join(baseDir, somePath)));
}

export type PackageGraphOptions = {
  basePath: string;
  entrypoint?: string;
  parent?: GraphNode<PackageNode>;
  project?: ProjectGraph;
};
export class PackageGraph {
  protected debug: Debugger = debug(`rehearsal:migration-graph-shared:${this.constructor.name}`);

  protected baseDir: string;
  protected package: Package;
  protected entrypoint?: string;
  protected parentNode?: GraphNode<PackageNode>;
  protected projectGraph?: ProjectGraph;

  #graph: Graph<ModuleNode>;

  constructor(p: Package, options: PackageGraphOptions) {
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

    const include = this.package.includePatterns ? Array.from(this.package.includePatterns) : ['.'];

    let exclude = this.package.excludePatterns ? Array.from(this.package.excludePatterns) : [];

    const cruiseOptions: ICruiseOptions = {
      baseDir,
      exclude: {
        path: ['node_modules', ...EXCLUDE_FILE_EXTS, ...exclude],
      },
    };

    let result: IReporterOutput;

    // TODO get entrypoint  Package (maybePackage) and instantiate with that value if provided from API.
    const target = entrypoint ? [entrypoint] : [...include];

    const resolveOptions = this.resolveOptions;
    this.debug('Executing dependency-cruiser');
    this.debug('Target: %O', target);
    // this.debug('cruiseOptions: %O', cruiseOptions);
    // this.debug('resolveOptions: %O', { ...resolveOptions, fileSystem: undefined });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      result = cruise(target, cruiseOptions, resolveOptions) as IReporterOutput;
    } catch (error) {
      throw new Error(`Unable to cruise: ${error}`);
    }

    this.debug(result);

    const output = result.output as ICruiseResult;

    output.modules.forEach((m: IModule) => {
      this.debug(m);

      if (isExternalModule(m)) {
        return;
      }

      // IModule.source and IDependency.resolved paths from dependency-cruiser can
      // have awkward paths when using a tmpDir in MacOS resolving the paths to the
      // baseDir helps ensure we always get a file path relative to the baseDir.

      const sourcePath = resolveRelative(baseDir, m.source);

      if (this.isFileExternalToPackage(sourcePath)) {
        this.debug(
          `The target file "${sourcePath}" is external to package "${this.package.packageName}" (${baseDir}), omitting target file form package-graph.`
        );
        // Should resolve path completely relative to the project and find which package it belongs to.
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
          this.debug(
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
