import type { FileNode } from './file-node.js';
import type { PackageGraph } from './project-graph.js';

export function topSortFiles(graph: PackageGraph): FileNode[] {
  const nodes: FileNode[] = [];

  // Mark all nodes as unvisited
  const visited: Map<string, boolean> = new Map();
  for (const pkg of graph.packages.values()) {
    for (const file of pkg.files) {
      visited.set(file.id, false);
      nodes.push(file);
    }
  }

  const result: FileNode[] = [];

  // Helper function to visit a node and its children recursively
  function visit(node: FileNode): void {
    if (!visited.get(node.id)) {
      visited.set(node.id, true);
      for (const child of node.edges) {
        visit(child);
      }
      result.push(node);
    }
  }

  // Visit each unvisited node
  for (const node of nodes) {
    visit(node);
  }

  return result;
}
