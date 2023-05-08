import assert from 'node:assert';
import { dirname } from 'node:path';
import { PackageJson } from 'type-fest';
import { PackageNode } from './package-node.js';
import { FileNode } from './file-node.js';
import { readPackageJson } from './utils/read-package-json.js';

export class PackageGraph {
  packages: Map<string, PackageNode>;

  constructor() {
    this.packages = new Map();
  }

  addFileToPackage(pkgJSONRoot: string, fileName: string): void {
    const pkgJSON = readPackageJson(pkgJSONRoot);
    const packageNode = this.addPackage(pkgJSON, dirname(pkgJSONRoot));
    const fileNode = new FileNode(fileName);
    packageNode.addFile(fileNode);
  }

  hasFile(packageName: string, fileName: string): boolean {
    if (this.packages.has(packageName)) {
      const pkg = this.packages.get(packageName);
      assert(pkg, 'Should have pkg');
      return pkg.hasFile(fileName);
    }

    return false;
  }

  addDependency(fromPackage: string, fromFile: string, toPackage: string, toFile: string): void {
    const fromPackageNode = this.getPackageNode(fromPackage);
    const toPackageNode = this.getPackageNode(toPackage);

    // Create edges between packages
    if (fromPackageNode !== toPackageNode) {
      fromPackageNode.addEdge(toPackageNode);
    }

    // Create edges between files in different packages
    const fromFileNode = fromPackageNode.getFileNode(fromFile);
    const toFileNode = toPackageNode.getFileNode(toFile);
    if (toFileNode && fromFileNode) {
      fromFileNode.addEdge(toFileNode);
    }
  }

  getPackageNameFromFileId(fileId: string): string | undefined {
    for (const packageNode of this.packages.values()) {
      if (packageNode.getFileNode(fileId)) {
        return packageNode.name;
      }
    }
  }

  private addPackage(pkgJSON: PackageJson, packageRoot: string): PackageNode {
    if (pkgJSON.name && !this.packages.has(pkgJSON.name)) {
      const packageNode = new PackageNode(pkgJSON, packageRoot);
      this.packages.set(pkgJSON.name, packageNode);
    }

    assert(pkgJSON.name, `Missing a "name" field.`);

    return this.getPackageNode(pkgJSON.name);
  }

  private getPackageNode(name: string): PackageNode {
    const packageNode = this.packages.get(name);
    if (!packageNode) {
      throw new Error(`Package '${name}' not found in the graph.`);
    }
    return packageNode;
  }
}
