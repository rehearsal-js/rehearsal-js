import debug from 'debug';
import { Graph, GraphNode } from '../graph';
import { Package } from './package';

import type { PackageNode } from '../types';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-shared:project-graph');

// TODO this package level dependency data should be surfaced in a report

export type ProjectGraphOptions = { eager?: boolean; sourceType?: string };

export class ProjectGraph {
  #rootDir: string;
  #graph: Graph<PackageNode>;
  #sourceType: string;
  #eager: boolean;

  constructor(rootDir: string, options?: ProjectGraphOptions) {
    const { eager, sourceType } = { eager: false, sourceType: 'JavaScript Library', ...options };

    this.#rootDir = rootDir;
    this.#eager = eager;
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
    };

    const entry: GraphNode<PackageNode> = this.#graph.hasNode(p.packageName)
      ? this.#graph.updateNode(p.packageName, contents)
      : this.#graph.addNode(contents);

    if (this.#eager) {
      p.getModuleGraph({ parent: entry, project: this });
    }

    if (isConverted) {
      DEBUG_CALLBACK('Package %0 appears to been migrated to Typescript.', p.packageName);
    }

    return entry;
  }
}
