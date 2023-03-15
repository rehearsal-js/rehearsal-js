import fs from 'node:fs';
import { join, resolve } from 'node:path';
import enhancedResolve from 'enhanced-resolve';
import {
  Graph,
  GraphNode,
  IPackage,
  ModuleNode,
  Package,
  PackageGraph,
  PackageGraphOptions,
  PackageNode,
} from '@rehearsal/migration-graph-shared';
import debug, { type Debugger } from 'debug';
import { IResolveOptions } from '@rehearsal/migration-graph-shared/types/dependency-cruiser/index.js';
import { discoverServiceDependencies } from '../utils/discover-ember-service-dependencies.js';
import { EmberAppPackage } from './ember-app-package.js';
import { EmberAddonPackage } from './ember-addon-package.js';
import { EmberAppProjectGraph } from './ember-app-project-graph.js';

export class SyntheticPackage extends Package implements IPackage {
  #graph: Graph<ModuleNode>;

  constructor() {
    super('/dev/null');
    this.#graph = new Graph<ModuleNode>();
  }

  override getModuleGraph(): Graph<ModuleNode> {
    return this.#graph;
  }
}

export type EmberAppPackageGraphOptions = {
  parent?: GraphNode<PackageNode>;
  project?: EmberAppProjectGraph;
  resolutions?: { services: Record<string, string> };
} & PackageGraphOptions;

export class EmberAppPackageGraph extends PackageGraph {
  override debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);

  serviceLookup: Map<string, string>;
  override package: EmberAppPackage;
  parent: GraphNode<PackageNode> | undefined;
  project: EmberAppProjectGraph | undefined;

  constructor(pkg: EmberAppPackage, options: EmberAppPackageGraphOptions = {}) {
    super(pkg, options);

    this.package = pkg;
    this.parent = options.parent;
    this.project = options?.project;

    this.serviceLookup = new Map<string, string>();

    if (options?.resolutions?.services) {
      const services = options.resolutions.services;
      for (const [identifier, module] of Object.entries(services)) {
        this.serviceLookup.set(identifier, module);
      }
    }
  }
  /**
   *
   *  When we add an ember module (file) to the graph. It may contain services.
   *  If we we find a service, we add a synthetic node to the graph to model the
   *  dependency.
   *
   *  Later during graph creation, we may add the service node to the graph.
   *
   *  In this case we are processing that file.
   *
   *  We need to update that Node with the complete ModuleNode data.
   *  Then we parse that service file for any other service depdendencies.
   *
   * @param m A `ModuleNode` with the path information
   * @returns Node<ModuleNode> the new or existing Node<ModuleNode>
   */
  override addNode(m: ModuleNode): GraphNode<ModuleNode> {
    let n: GraphNode<ModuleNode>;

    const moduleNodeKey = m.key;

    this.debug(
      `>>> attempting to addNode to packageGraph for: ${this.package.packageName}, with path:  ${moduleNodeKey}`
    );

    // Thus completing the self sustaining economy.
    if (this.graph.hasNode(moduleNodeKey)) {
      this.debug(`>>> getNode ${moduleNodeKey}`);
      n = this.graph.getNode(moduleNodeKey);

      if (this.graph.getNode(moduleNodeKey)?.content.synthetic) {
        this.debug(`>>> updateNode ${moduleNodeKey}`);
        n = this.graph.updateNode(moduleNodeKey, m);
      }
    } else {
      this.debug(`>>> addNode ${moduleNodeKey}`);
      n = this.graph.addNode(m);
    }

    if (n.content.parsed) {
      return n;
    }

    const services = discoverServiceDependencies(this.baseDir, n.content.path);

    this.debug('>>> SERVICES DISCOVERD', services);

    services.forEach((s) => {
      const maybePathToService = `app/services/${s.serviceName}.js`;

      // Does the service exist in this package?
      // If so it will have a node on the graph with the given file path.
      if (this.graph.hasNode(maybePathToService)) {
        const someService = this.graph.getNode(maybePathToService);
        if (!someService) {
          throw new Error(
            'EmberAppPackageDependencyGraph: Unknown error occured. Unable to retrieve existing service'
          );
        }
        this.graph.addEdge(n, someService);
        return;
      }

      // If the service doesn't exist we need to determine if it exists in the app or an in-repo addon.

      // If the service is a external resolution, we can ignore it.
      // We look this up in our resolution map to short-circuit this process
      if (this.hasServiceResolution(s.serviceName)) {
        // Look at the resolution.
        const maybePackage = this.getServiceResolution(s.serviceName);

        if (!maybePackage) {
          throw new Error(
            `Unknown error occured. Invalid resolution for service '${s.serviceName}' in options.resolutions.services`
          );
        }

        // Does it exist in package.json
        // If yes then it's truly external and we can ignore it
        if (this.package.dependencies && this.package.dependencies[maybePackage]) {
          this.debug(
            `Ignore! A resolution was found for serivce '${s.serviceName}' in file '${m.path}'.`
          );
          return;
        }

        throw new Error(
          'TBD, at this point we have a resolution to some file on disk. We will need to create a synth node here or something'
        );
      }

      // If we found an addonName we potentially have a resolution within project to a service implmentation
      if (s.addonName) {
        this.debug(`Coordinates: s.addonName: ${s.addonName} for ${s.serviceName}`);
        // Lookup the addonName in the package graph
        const maybeAddonPackageNode: GraphNode<PackageNode> | undefined =
          this.findPackageNodeByAddonName(s.addonName);

        if (maybeAddonPackageNode) {
          this.debug('findPackageNodeByAddonName: %O', maybeAddonPackageNode);
        }

        if (maybeAddonPackageNode) {
          // We've found a package in the migration graph that has the addonName
          const { synthetic, pkg } = maybeAddonPackageNode.content;

          if (!synthetic) {
            const emberAddonPackage = pkg as EmberAddonPackage;

            // Looking for the implementation at addon/ becase some addons may not have an app/ for re-exports of the service
            const key = `addon/services/${s.serviceName}.js`;

            const someServiceInAnInRepoAddon = join(emberAddonPackage.path, key);

            this.debug(emberAddonPackage.path);
            this.debug(someServiceInAnInRepoAddon);

            if (key) {
              const dest = emberAddonPackage.getModuleGraph().hasNode(key);
              if (!dest) {
                const sourceFile = join(this.baseDir, moduleNodeKey);
                const destFile = join(emberAddonPackage.path);

                throw new Error(
                  `Unexpected error when parsing ${sourceFile}. Attempting to resolve service "${s.serviceName}" from module/package name "${s.addonName}" in package: ${destFile}.`
                );
              }

              // Create an edge between these packages.
              // We can create edges between files but I dont know if we want that yet.
              // Get this package Node<PackageNode> for this package.

              if (this.parent) {
                this.debug('Adding edge between parent and addon');
                this.project?.graph.addEdge(this.parent, maybeAddonPackageNode);
              }
            }
          } else {
            // Create an edge between these packages.
            // We can create edges between packages in the project.
            // When the actual implmentation is added to the project, it will
            // get updated.

            if (this.parent) {
              this.debug('Adding edge between parent and addon');
              this.project?.graph.addEdge(this.parent, maybeAddonPackageNode);
            }
          }
        } else {
          // It's an unknown package, maybe external?
          if (this.parent) {
            const key = s.addonName;
            const dest = this.createSyntheticPackageNode(key);
            this.project?.graph.addEdge(this.parent, dest);
          }
        }
      }

      // Does this service exist within this app
      if (this.fileExists(join(this.baseDir, maybePathToService))) {
        const serviceNode = this.createSyntheticModuleNode(maybePathToService); // We create this now, and will backfill later as the graph is filled out.
        this.graph.addEdge(n, serviceNode);
      } else {
        // Lookup resolutions
        // Prompt for resolutions? TODO
        // These resolutions should always be external.
      }
    });

    n.content.parsed = true;

    return n;
  }

  private findPackageNodeByAddonName(addonName: string): GraphNode<PackageNode> | undefined {
    if (!this.project) {
      return undefined;
    }

    return this.project.findPackageByAddonName(addonName);
  }

  /**
   * Returns true of the file exists in the package.
   * @param relativePath
   * @returns
   */
  private fileExists(relativePath: string): boolean {
    return fs.existsSync(resolve(relativePath));
  }

  getServiceResolution(serviceName: string): string | undefined {
    return this.serviceLookup.get(serviceName);
  }

  hasServiceResolution(serviceName: string): boolean {
    return this.serviceLookup.has(serviceName);
  }

  createSyntheticModuleNode(key: string): GraphNode<ModuleNode> {
    if (this.graph.hasNode(key)) {
      return this.graph.getNode(key);
    }

    return this.graph.addNode({
      key,
      path: key,
      synthetic: true,
    });
  }

  createSyntheticPackageNode(key: string): GraphNode<PackageNode> {
    const graph = this.project?.graph;

    if (!graph) {
      throw new Error(`Unable to createSyntheticPackageNode for ${key}`);
    }

    if (graph.hasNode(key)) {
      const node = graph.getNode(key);

      if (!node) {
        throw new Error(`Internal error: Unable to retrieve Node<ModuleNode> for ${key}`);
      }
      return node;
    }

    return graph.addNode({
      key,
      pkg: new SyntheticPackage(), // We could make pkg optionally undfined but this simplifies iteration
      synthetic: true,
    });
  }

  override get resolveOptions(): IResolveOptions {
    // Create resolution for an ember application to itself
    // e.g. 'my-app-name/helpers/to-kebab-case';

    const appName = this.package.packageName;

    const alias: Record<string, string> = {};
    const appDir = resolve(this.baseDir, 'app');
    alias[appName] = appDir;

    return {
      fileSystem: new enhancedResolve.CachedInputFileSystem(fs, 4000),
      resolveDeprecations: false,
      alias: alias,
      extensions: ['.js', '.gjs'], // Add .gjs extension so this will be crawled by dependency-cruiser
    };
  }
}
