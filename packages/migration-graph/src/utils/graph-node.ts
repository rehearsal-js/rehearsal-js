export class GraphNode<Type> {
  // eslint-disable-next-line no-use-before-define
  #parent: GraphNode<Type> | null = null;

  // eslint-disable-next-line no-use-before-define
  #adjacent: Set<GraphNode<Type>>;

  #content: Type;

  constructor(content: Type) {
    this.#content = content;
    this.#adjacent = new Set();
  }

  get content(): Type {
    return this.#content;
  }

  get adjacent(): Set<GraphNode<Type>> {
    return this.#adjacent;
  }

  get parent(): GraphNode<Type> | null {
    return this.#parent;
  }

  setParent(node: GraphNode<Type>): void {
    this.#parent = node;
  }

  addAdjacent(node: GraphNode<Type>): void {
    if (!this.#adjacent.has(node)) {
      node.setParent(this);
      this.#adjacent.add(node);
    }
  }
}
