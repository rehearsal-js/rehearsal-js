import fs from 'fs';
import { join, resolve } from 'path';
import { CachedInputFileSystem } from 'enhanced-resolve';
import { IResolveOptions } from 'dependency-cruiser';
import {
  discoverServiceDependencies,
  EmberAppPackage,
  EmberAddonPackage,
} from '@rehearsal/migration-graph-ember';
import debug from 'debug';
import { ModuleNode, PackageNode } from '../types';
import { ProjectGraph } from '../project-graph';
import { Graph } from '../utils/graph';
import { GraphNode } from '../utils/graph-node';
import { PackageGraph, PackageGraphOptions } from './package';

const DEBUG_CALLBACK = debug(
  'rehearsal:migration-graph:package-dependency-graph:EmberAppPackageDependencyGraph'
);

export type EmberAppPackageyGraphOptions = {
  parent?: GraphNode<PackageNode>;
  project?: ProjectGraph;
  resolutions?: { services: Record<string, string> };
} & PackageGraphOptions;

export class EmberAppPackageGraph extends PackageGraph {
  serviceLookup: Map<string, string>;

  package: EmberAppPackage;
  parent: GraphNode<PackageNode> | undefined;
  project: ProjectGraph | undefined;

  constructor(pkg: EmberAppPackage, options: EmberAppPackageyGraphOptions = {}) {
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
   *  We need to update that GraphNode with the complete ModuleNode data.
   *  Then we parse that service file for any other service depdendencies.
   *
   * @param m A `ModuleNode` with the path information
   * @returns GraphNode<ModuleNode> the new or existing GraphNode<ModuleNode>
   */
  addNode(m: ModuleNode): GraphNode<ModuleNode> {
    let n: GraphNode<ModuleNode>;

    const moduleNodeKey = m.key;

    DEBUG_CALLBACK(`>>> attempting to adddNode ${this.package.packageName} ${moduleNodeKey}`);

    // Thus completing the self sustaining e  conomy.
    if (this.graph.hasNode(moduleNodeKey)) {
      DEBUG_CALLBACK(`>>> getNode ${moduleNodeKey}`);
      n = this.graph.getNode(moduleNodeKey);

      if (this.graph.getNode(moduleNodeKey)?.content.synthetic) {
        DEBUG_CALLBACK(`>>> updateNode ${moduleNodeKey}`);
        n = this.graph.updateNode(moduleNodeKey, m);
      }
    } else {
      DEBUG_CALLBACK(`>>> addNode ${moduleNodeKey}`);
      n = this.graph.addNode(m);
    }

    if (n.content.parsed) {
      return n;
    }

    const services = discoverServiceDependencies(this.baseDir, n.content.path);
    DEBUG_CALLBACK('>>> SERVICES DISCOVERD', services);

    services.forEach((s) => {
      const maybePathToService = `app/services/${s.serviceName}.js`;

      // Does the service exist in our graph?
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
        if (this.package.dependencies[maybePackage]) {
          DEBUG_CALLBACK(
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
        DEBUG_CALLBACK(`Coordinates: s.addonName: ${s.addonName} for ${s.serviceName}`);
        // Lookup the addonName in the package graph
        const maybeAddonPackageNode: GraphNode<PackageNode> | undefined =
          this.findPackageNodeByAddonName(s.addonName);
        DEBUG_CALLBACK('findPackageNodeByAddonName', maybeAddonPackageNode);

        if (maybeAddonPackageNode) {
          // We've found a package in the migration graph that has the addonName
          const packageNode = maybeAddonPackageNode.content;

          const emberAddonPackage = packageNode.pkg as EmberAddonPackage;

          const someServiceInAnInRepoAddon = join(
            emberAddonPackage.packagePath,
            `app/services/${s.serviceName}.js`
          );

          DEBUG_CALLBACK(emberAddonPackage.path);

          DEBUG_CALLBACK(someServiceInAnInRepoAddon);
          const key = `app/services/${s.serviceName}.js`;

          if (packageNode.modules.hasNode(key)) {
            const dest = packageNode.modules.getNode(key);
            if (!dest) {
              throw new Error(
                `Unexpected Error; Unable to retreive node ${key} from package ${packageNode.key}`
              );
            }

            // Create an edge between these packages.
            // We can create edges between files but I dont know if we want that yet.
            // Get this package GraphNode<PackageNode> for this package.

            if (this.parent) {
              DEBUG_CALLBACK('Adding edge between parent and addon');
              this.project?.graph.addEdge(this.parent, maybeAddonPackageNode);
            }
          }
        } else {
          if (this.parent) {
            const key = s.addonName;
            const dest = this.createSyntheticPackageNode(key);
            this.project?.graph.addEdge(this.parent, dest);
          }

          // Stub out with a sythetic to package.
          // throw new Error(`TBD s.addon synthetic node not yet created. ${s.addonName}`);
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
    // I think we need the parent graph here. this.graph is for the app and not all the packages.
    if (!this.project) {
      return undefined;
    }
    DEBUG_CALLBACK('findPackageNodeByAddonName:');
    return Array.from(this.project.graph.nodes).find((n: GraphNode<PackageNode>) => {
      DEBUG_CALLBACK(n.content);
      if (n.content.key === addonName) {
        DEBUG_CALLBACK(
          `Found an EmberAddonPackage ${(n.content.pkg as EmberAddonPackage).emberAddonName}`
        );
        return true;
      }
      return false;
    });
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
        throw new Error(`Internal error: Unable to retrieve GraphNode<ModuleNode> for ${key}`);
      }
      return node;
    }

    return graph.addNode({
      key,
      pkg: undefined,
      modules: new Graph<ModuleNode>(),
      synthetic: true,
    });
  }

  get resolveOptions(): IResolveOptions {
    // Create resolution for an ember application to itself
    // e.g. 'my-app-name/helpers/to-kebab-case';

    const appName = this.package.packageName;

    const alias: Record<string, string> = {};
    alias[appName] = resolve(this.baseDir, 'app');

    return {
      fileSystem: new CachedInputFileSystem(fs, 4000),
      resolveDeprecations: false,
      alias: alias,
    };
  }
}
