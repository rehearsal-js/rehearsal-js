import type { GraphNode, PackageNode, ProjectGraph } from '@rehearsal/migration-graph-shared';

function printRelationship(source: GraphNode<PackageNode>, dest: GraphNode<PackageNode>): string {
  return `"${source.content.key}" -> "${dest.content.key}";`;
}

export function printDirectedGraph(_name: string, projectGraph: ProjectGraph): string {
  const nodes = projectGraph.graph.getSortedNodes();

  const entries = Array.from(nodes).map((p) => {
    return Array.from(p.adjacent).map((dest) => {
      const source = p;
      return printRelationship(source, dest);
    });
  });

  const output = [`digraph "graph" {`, ...entries.flat().map((s) => `  ${s}`), '}'];

  return output.join('\n');
}
