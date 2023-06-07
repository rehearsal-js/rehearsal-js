import assert from 'node:assert';
import { extname } from 'node:path';
import { FileNode } from './file-node.js';
import { PackageGraph } from './project-graph.js';
import { PrinterOptions } from './types.js';

export function generateJson(
  rootPath: string,
  packageGraph: PackageGraph,
  fileNodes: FileNode[],
  options: PrinterOptions = { hideHbs: false }
): string {
  const result: {
    name: string;
    external: boolean;
    files: {
      name: string;
      edges: { packageName: string; fileName: string }[];
    }[];
  }[] = [];

  fileNodes = fileNodes.filter((file) => {
    if (options.hideHbs) {
      // If the hideHbs option is true, we omit all
      // files with the.hbs ext
      return extname(file.id) !== '.hbs';
    }
    return true;
  });

  // Group files by package
  const filesByPackage: Map<string, FileNode[]> = new Map();
  const externalPackages: Set<string> = new Set();
  const missingPackages: Set<string> = new Set();
  for (const packageNode of packageGraph.packages.values()) {
    filesByPackage.set(packageNode.name, []);

    if (packageNode.external) {
      externalPackages.add(packageNode.name);
    }

    if (packageNode.missing) {
      missingPackages.add(packageNode.name);
    }
  }

  for (const fileNode of fileNodes) {
    const packageName = packageGraph.getPackageNameFromFileId(fileNode.id);
    assert(packageName);
    const packageFiles = filesByPackage.get(packageName);
    if (packageFiles) {
      packageFiles.push(fileNode);
    }
  }

  // Build the result
  for (const [packageName, files] of filesByPackage) {
    const packageData: {
      name: string;
      external: boolean;
      files: {
        name: string;
        edges: { packageName: string; hasTypes: boolean; missing: boolean; fileName: string }[];
      }[];
    } = {
      name: packageName,
      external: externalPackages.has(packageName),
      files: [],
    };

    for (const fileNode of files) {
      const packageNode = packageGraph.getPackageNode(packageName);
      assert(packageNode);
      const fileData: {
        name: string;
        hasTypes: boolean;
        edges: { packageName: string; missing: boolean; hasTypes: boolean; fileName: string }[];
      } = {
        name: fileNode.id.replace(rootPath, '.'),
        hasTypes: packageNode.hasTypes(fileNode.id),
        edges: [],
      };

      for (const edge of fileNode.edges) {
        const edgePackageName = packageGraph.getPackageNameFromFileId(edge.id);
        assert(edgePackageName);
        const edgeNode = packageGraph.getPackageNode(edgePackageName);
        assert(edgeNode);

        fileData.edges.push({
          packageName: edgePackageName,
          hasTypes: edgeNode.hasTypes(edge.id),
          fileName: edge.id.replace(rootPath, '.'),
          missing: packageNode.isDependencyMissing(edgePackageName),
        });
      }

      packageData.files.push(fileData);
    }

    if (packageData.files.length > 0) {
      result.push(packageData);
    }
  }

  return JSON.stringify(result, null, 2);
}
