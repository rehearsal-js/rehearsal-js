import debug from 'debug';
import { Graph, GraphNode } from '../graph';
import { Package } from './package';

import type { ModuleNode, PackageNode } from '../types';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-shared:project-graph');

// TODO this package level dependency data should be surfaced in a report

export class ProjectGraph {
  #rootDir: string;
  #graph: Graph<PackageNode>;
  #sourceType: string;

  constructor(rootDir: string, sourceType: string) {
    this.#rootDir = rootDir;
    this.#sourceType = sourceType;
    this.#graph = new Graph<PackageNode>();
  }

  get rootDir(): string {
    return this.#rootDir;
  }

  get graph(): Graph<PackageNode> {
    return this.#graph;
  }

  get sourceType(): string {
    return this.#sourceType;
  }

  addPackageToGraph(p: Package): GraphNode<PackageNode> {
    DEBUG_CALLBACK(`\n------------------`);
    DEBUG_CALLBACK('Package Name: %0', p.packageName);
    DEBUG_CALLBACK('Package Path: %0', p.packagePath);

    const isConverted = p.isConvertedToTypescript('source-only');

    const contents = {
      key: p.packageName,
      pkg: p,
      converted: isConverted,
      modules: new Graph<ModuleNode>(),
    };

    const entry: GraphNode<PackageNode> = this.#graph.hasNode(p.packageName)
      ? this.#graph.updateNode(p.packageName, contents)
      : this.#graph.addNode(contents);

    let modules;

    if (!isConverted) {
      modules = p.createModuleGraph({ project: this, parent: entry });
    } else {
      modules = new Graph<ModuleNode>();
      DEBUG_CALLBACK('Package %0 appears to been migrated to Typescript.', p.packageName);
    }

    entry.content.modules = modules;

    return entry;
  }
}
