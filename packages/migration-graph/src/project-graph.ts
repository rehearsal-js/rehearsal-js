import assert from 'node:assert';
import { PackageNode, PackageOptions } from './package-node.js';
import { FileNode } from './file-node.js';

export class PackageGraph {
  packages: Map<string, PackageNode>;

  constructor() {
    this.packages = new Map();
  }

  addFileToPackage(packageNode: PackageNode, fileName: string): void {
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

    assert(fromPackageNode);
    assert(toPackageNode);

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

  addPackage(options: PackageOptions): PackageNode {
    const { pkgJson } = options;
    if (pkgJson.name && !this.packages.has(pkgJson.name)) {
      const packageNode = new PackageNode(options);
      // set the packages both the name and aliases
      for (const name of packageNode.aliases) {
        this.packages.set(name, packageNode);
      }
    }

    assert(pkgJson.name, `Missing a "name" field.`);

    const packageNode = this.getPackageNode(pkgJson.name);

    assert(packageNode, `Missing package node for ${pkgJson.name}`);

    return packageNode;
  }

  getPackageNode(name: string): PackageNode | undefined {
    const packageNode = this.packages.get(name);
    return packageNode;
  }
}
