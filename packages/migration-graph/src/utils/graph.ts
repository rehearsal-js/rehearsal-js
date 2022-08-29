import { UniqueGraphNode } from 'src/types';
import { GraphNode } from './graph-node';

export class Graph<Type extends UniqueGraphNode> {
  #nodes: Set<GraphNode<Type>>;
  #registry: Map<string, GraphNode<Type>>;

  constructor() {
    this.#nodes = new Set();
    this.#registry = new Map();
  }

  get nodes(): Set<GraphNode<Type>> {
    return this.#nodes;
  }

  addNode(content: Type): GraphNode<Type> {
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

  addEdge(source: GraphNode<Type>, destination: GraphNode<Type>): Graph<Type> {
    source.addAdjacent(destination);
    return this;
  }

  topSort(): GraphNode<Type>[] {
    const visited = new Set<GraphNode<Type>>();
    const stack = new Array<GraphNode<Type>>();

    Array.from(this.#nodes).forEach((node: GraphNode<Type>) => {
      if (!visited.has(node)) {
        // const iterator = topSort(node, visited);
        this.topSortUtil(node, visited, stack);
      }
    });

    return stack; // stack.reverse();
  }

  private topSortUtil(
    node: GraphNode<Type>,
    visited = new Set<GraphNode<Type>>(),
    stack = new Array<GraphNode<Type>>()
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
