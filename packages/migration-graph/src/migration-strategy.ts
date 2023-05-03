import { join, relative } from 'node:path';
import { realpathSync } from 'node:fs';
import { GraphNode, ModuleNode, PackageNode } from '@rehearsal/migration-graph-shared';
import { buildMigrationGraph, type MigrationGraphOptions } from './migration-graph.js';
import { type SourceType } from './source-type.js';

export class SourceFile {
  #packageName: string;
  #path: string;
  #relativePath: string;

  constructor(path: string, relativePath: string, packageName: string) {
    this.#path = path;
    this.#relativePath = relativePath;
    this.#packageName = packageName;
  }

  get path(): string {
    return this.#path;
  }

  get relativePath(): string {
    return this.#relativePath;
  }

  get packageName(): string {
    return this.#packageName;
  }

  toString(): string {
    return `[${this.#packageName}] ${this.path} `;
  }
}

export class MigrationStrategy {
  #rootDir: string;
  #sourceType: SourceType;
  #files: Array<SourceFile> = [];

  constructor(rootDir: string, sourceType: SourceType) {
    this.#rootDir = rootDir;
    this.#sourceType = sourceType;
  }

  get rootDir(): string {
    return this.#rootDir;
  }

  addFile(file: SourceFile): void {
    this.#files.push(file);
  }

  get files(): Array<SourceFile> {
    return this.#files;
  }

  get sourceType(): SourceType {
    return this.#sourceType;
  }

  getMigrationOrder(): Array<SourceFile> {
    return this.#files;
  }

  toString(): string {
    const files = this.#files.reduce((f, result) => `${result}\n${f}`, '');
    return `Suggested Migration Strategy\n${files}`;
  }
}

export type MigrationStrategyOptions = MigrationGraphOptions;

export function getMigrationStrategy(
  srcDir: string,
  options: MigrationStrategyOptions
): MigrationStrategy {
  srcDir = realpathSync(srcDir);
  const { projectGraph, sourceType } = buildMigrationGraph(options.basePath, srcDir, options);

  const strategy = new MigrationStrategy(srcDir, sourceType);

  projectGraph.graph
    .getSortedNodes()
    // Iterate through each package
    .forEach((packageNode: GraphNode<PackageNode>) => {
      const packagePath = packageNode.content?.pkg?.path;

      if (!packagePath) {
        return;
      }

      if (!packageNode.content.pkg) {
        throw new Error('Unable to create MigrationStrategy, packageNode has no Package');
      }

      const somePackage = packageNode.content.pkg;

      const moduleGraph = somePackage.getModuleGraph({ project: projectGraph });

      // For this package, get a list of modules (files)
      const ordered: Array<ModuleNode> = moduleGraph
        .getSortedNodes()
        .filter((node) => !node.content?.synthetic) // Remove synthetic nodes
        .map((node) => node.content);

      // Iterate through each module (file) node
      ordered.forEach((moduleNode) => {
        const fullPath = join(packagePath, moduleNode.path);
        const relativePath = relative(options.basePath, realpathSync(fullPath));
        const f = new SourceFile(fullPath, relativePath, packagePath);
        strategy.addFile(f);
      });
    });

  return strategy;
}

export function getMigrationOrder(srcDir: string, options: MigrationStrategyOptions): SourceFile[] {
  return getMigrationStrategy(srcDir, options).getMigrationOrder();
}
