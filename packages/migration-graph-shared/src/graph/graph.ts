import { GraphNode } from './node';
import type { UniqueNode } from '../types';

export class Graph<T extends UniqueNode> {
  #nodes: Set<GraphNode<T>>;
  #registry: Map<string, GraphNode<T>>;

  constructor() {
    this.#nodes = new Set();
    this.#registry = new Map();
  }

  get nodes(): Set<GraphNode<T>> {
    return this.#nodes;
  }

  get registry(): Map<string, GraphNode<T>> {
    return this.#registry;
  }

  hasNode(key: string): boolean {
    return this.#registry.has(key);
  }

  getNode(key: string): GraphNode<T> {
    const node = this.#registry.get(key);

    if (!node) {
      throw new Error(`Unable to getNode() with key: ${key}. Not found in graph registry.`);
    }

    return node;
  }

  updateNode(key: string, content: T): GraphNode<T> {
    const node = this.getNode(key);
    if (!node) {
      throw new Error(`Unable to updateNode '${key}' with content '${content}'.`);
    }
    node.content = content;
    return node;
  }

  addNode(content: T): GraphNode<T> {
    const { key } = content;
    if (this.hasNode(key)) {
      const node = this.getNode(key);
      if (!node) {
        throw new Error(`Registry populated with undefined graph node at ${key}`);
      }

      return node;
    }

    const newNode = new GraphNode<T>(content);
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

    return stack; // stack.reverse() would be leaf first.
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
