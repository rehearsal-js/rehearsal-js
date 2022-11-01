import type { GraphNode } from './node';

export function dfs<T>(entry: GraphNode<T>): Array<GraphNode<T>> {
  const visited = new Set<GraphNode<T>>();
  const stack = new Array<GraphNode<T>>();
  dfsUtil(entry, visited, stack);
  return stack;
}

function dfsUtil<T>(
  node: GraphNode<T>,
  visited: Set<GraphNode<T>>,
  stack: Array<GraphNode<T>>
): void {
  visited.add(node);

  node.adjacent.forEach((adj) => {
    if (adj && !visited.has(adj)) {
      dfsUtil(adj, visited, stack);
    }
  });

  stack.push(node);
}
