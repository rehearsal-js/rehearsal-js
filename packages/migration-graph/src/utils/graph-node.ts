export class GraphNode<T> {
  // eslint-disable-next-line no-use-before-define
  #parent: GraphNode<T> | null = null;

  // eslint-disable-next-line no-use-before-define
  #adjacent: Set<GraphNode<T>>;

  #content: T;

  constructor(content: T) {
    this.#content = content;
    this.#adjacent = new Set();
  }

  get content(): T {
    return this.#content;
  }

  set content(content: T) {
    this.#content = content;
  }

  get adjacent(): Set<GraphNode<T>> {
    return this.#adjacent;
  }

  get parent(): GraphNode<T> | null {
    return this.#parent;
  }

  setParent(node: GraphNode<T>): void {
    this.#parent = node;
  }

  addAdjacent(node: GraphNode<T>): void {
    if (!this.#adjacent.has(node)) {
      node.setParent(this);
      this.#adjacent.add(node);
    }
  }
}
