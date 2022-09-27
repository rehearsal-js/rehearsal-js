import fs from 'fs-extra';
import { join, relative } from 'path';

import { buildMigrationGraph, MigrationGraphOptions } from './migration-graph';
import { ModuleNode, PackageNode } from './types';
import { GraphNode } from './utils/graph-node';

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
  #files: Array<SourceFile> = [];

  addFile(file: SourceFile): void {
    this.#files.push(file);
  }

  get files(): Array<SourceFile> {
    return this.#files;
  }

  getMigrationOrder(): Array<SourceFile> {
    return this.#files;
  }

  toString(): string {
    const files = this.#files.reduce((f, result) => result + '\n' + f, '');
    return `Suggsted Migration Strategy\n${files}`;
  }
}

export type MigrationStrategyOptions = MigrationGraphOptions;

// TODO make rootDir default to process.cwd()
// TODO remove other process.cwd() default values elsewhere in code.
export function getMigrationStrategy(
  rootDir: string,
  options?: MigrationStrategyOptions
): MigrationStrategy {
  rootDir = fs.realpathSync(rootDir);
  const m = buildMigrationGraph(rootDir, options);

  const strategy = new MigrationStrategy();

  m.graph
    .topSort()
    // Iterate through each package
    .forEach((packageNode: GraphNode<PackageNode>) => {
      const packagePath = packageNode.content.pkg.packagePath;
      const modules = packageNode.content.modules;

      // For this package, get a list of modules (files)
      const ordered: Array<ModuleNode> = modules.topSort().map((node) => node.content);

      // Iterate through each module (file) node
      ordered.forEach((moduleNode) => {
        const fullPath = join(packagePath, moduleNode.path);
        const relativePath = relative(rootDir, fs.realpathSync(fullPath));
        const f = new SourceFile(fullPath, relativePath, packagePath);
        strategy.addFile(f);
      });
    });

  return strategy;
}
