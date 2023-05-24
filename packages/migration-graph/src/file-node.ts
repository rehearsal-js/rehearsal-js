export class FileNode {
  readonly id: string;
  edges: FileNode[];
  private seenEdges: Set<string> = new Set();

  constructor(id: string) {
    this.id = id;
    this.edges = [];
  }

  addEdge(fileNode: FileNode): void {
    if (!this.seenEdges.has(fileNode.id)) {
      this.edges.unshift(fileNode);
      this.seenEdges.add(fileNode.id);
    }
  }
}
