import assert from 'node:assert';
import { PackageJson } from 'type-fest';
import { FileNode } from './file-node.js';

export class PackageNode {
  readonly name: string;
  readonly files: FileNode[];
  readonly pkg: PackageJson;
  readonly packageRoot: string;
  private readonly edges: PackageNode[];
  private seenFiles: Set<string> = new Set();
  private seenEdges: Set<string> = new Set();

  constructor(pkgJSON: PackageJson, packageRoot: string) {
    assert(pkgJSON.name, 'Must have a package name');
    this.name = pkgJSON.name;
    this.pkg = pkgJSON;
    this.packageRoot = packageRoot;
    this.files = [];
    this.edges = [];
  }

  addFile(file: FileNode): void {
    if (!this.seenFiles.has(file.id)) {
      this.files.push(file);
      this.seenFiles.add(file.id);
    }
  }

  getFileNode(name: string): FileNode | undefined {
    return this.files.find((file) => file.id === name);
  }

  hasFile(filePath: string): boolean {
    return this.seenFiles.has(filePath);
  }

  addEdge(node: PackageNode): void {
    if (!this.seenEdges.has(node.name)) {
      this.edges.push(node);
      this.seenEdges.add(node.name);
    }
  }

  getEdges(): PackageNode[] {
    return this.edges;
  }
}
