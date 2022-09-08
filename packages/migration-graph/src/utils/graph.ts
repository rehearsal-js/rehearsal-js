import { UniqueGraphNode } from 'src/types';

import { GraphNode } from './graph-node';

export class Graph<T extends UniqueGraphNode> {
  #nodes: Set<GraphNode<T>>;
  #registry: Map<string, GraphNode<T>>;

  constructor() {
    this.#nodes = new Set();
    this.#registry = new Map();
  }

  get nodes(): Set<GraphNode<T>> {
    return this.#nodes;
  }

  addNode(content: T): GraphNode<T> {
    const { key } = content;
    if (key && this.#registry.has(key)) {
      const node = this.#registry.get(key);
      if (!node) {
        throw new Error(`Registry populated with undefined graph node at ${key}`);
      }
      return node;
    }

    const newNode = new GraphNode(content);
    this.#nodes.add(newNode);
    this.#registry.set(key, newNode);
    return newNode;
  }

  addEdge(source: GraphNode<T>, destination: GraphNode<T>): Graph<T> {
    source.addAdjacent(destination);
    return this;
  }

  topSort(): GraphNode<T>[] {
    const visited = new Set<GraphNode<T>>();
    const stack = new Array<GraphNode<T>>();

    Array.from(this.#nodes).forEach((node: GraphNode<T>) => {
      if (!visited.has(node)) {
        // const iterator = topSort(node, visited);
        this.topSortUtil(node, visited, stack);
      }
    });

    return stack; // stack.reverse();
  }

  private topSortUtil(
    node: GraphNode<T>,
    visited = new Set<GraphNode<T>>(),
    stack = new Array<GraphNode<T>>()
  ): void {
    visited.add(node);

    node.adjacent.forEach((adj) => {
      if (adj && !visited.has(adj)) {
        this.topSortUtil(adj, visited, stack);
      }
    });

    stack.push(node);
  }
}
