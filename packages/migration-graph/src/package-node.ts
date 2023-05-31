import assert from 'node:assert';
import { existsSync, lstatSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { PackageJson } from 'type-fest';
import { MatchPath, createMatchPath } from 'tsconfig-paths';
import { FileNode } from './file-node.js';
import { isEmberAddon } from './ember/resolution.js';
import { SUPPORTED_TS_EXTENSIONS } from './utils/extensions.js';

export interface PathResolution {
  types?(names: string[]): boolean;
  aliases(name: string): string[];
  extensions: string[];
  paths(names: string[]): Record<string, string[]>;
}

export type PackageOptions =
  | {
      type: 'resolved';
      pkgJson: PackageJson;
      root: string;
      pathResolution: PathResolution;
    }
  | {
      type: 'missing';
      pkgJson: PackageJson;
      root: string;
    };

export type PackageOptionsWithoutPathing = Omit<PackageOptions, 'packagePaths'>;

export class PackageNode {
  readonly missing: boolean;
  readonly name: string;
  readonly files: FileNode[];
  readonly pkg: PackageJson;
  readonly packageRoot: string;
  readonly aliases: Set<string> = new Set();
  private readonly edges: PackageNode[];
  private seenFiles: Set<string> = new Set();
  private seenEdges: Set<string> = new Set();
  private paths?: Record<string, string[]>;
  private matcher: MatchPath;
  private typesOverride: boolean | undefined;
  private readonly deps: string[];

  constructor(options: PackageOptions) {
    const { pkgJson, root, type } = options;

    assert(pkgJson.name, 'Must have a package name');
    this.name = pkgJson.name;
    this.pkg = pkgJson;
    this.packageRoot = root;
    this.missing = type === 'missing' ?? false;
    this.files = [];
    this.edges = [];

    this.deps = Object.keys({
      ...this.pkg.dependencies,
      ...this.pkg.devDependencies,
    });

    if (type === 'resolved') {
      const { pathResolution } = options;
      const aliases = pathResolution.aliases(this.name);

      this.typesOverride = pathResolution.types?.(aliases);

      if (aliases) {
        aliases.forEach((alias) => this.aliases.add(alias));
      }

      this.paths = pathResolution.paths([...this.aliases]);
      const matcher = createMatchPath(root, this.paths);

      this.matcher = (importPath: string) => {
        let match: undefined | string;
        const { main, types, typings } = pkgJson;

        const mainField = main || types || typings;
        if (!isEmberAddon(root, pkgJson) && importPath === this.name && mainField) {
          return resolve(root, mainField);
        }
        for (const ext of pathResolution.extensions) {
          match = matcher(importPath, undefined, undefined, [ext]);
          if (match) {
            if (isDirectory(match)) {
              match = `${match}/index${ext}`;
            } else {
              match = match.replace(extname(match), '');
              match = `${match}${ext}`;
            }
            if (existsSync(match)) {
              return match;
            }
          }
        }

        return match;
      };
    } else {
      this.aliases.add(this.name);
      this.matcher = (filePath: string) => filePath;
    }
  }

  get external(): boolean {
    return this.packageRoot.includes('node_modules');
  }

  /**
   *
   * @param importPath ImportSourcePath
   * @returns an absolute path the code or undefined
   */
  resolvePath(importPath: string): string | undefined {
    const match = this.matcher(importPath);
    if (match) {
      return match;
    }
  }

  hasTypes(filePath: string): boolean {
    if (this.typesOverride) {
      return this.typesOverride;
    }

    if (SUPPORTED_TS_EXTENSIONS.some((ext) => filePath.endsWith(ext))) {
      return true;
    }
    // this should be expanded to support export maps but its a bit of a nightmare
    return !!(this.pkg.types || this.pkg.typings);
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

  isDependencyMissing(packageName: string): boolean {
    return !this.deps.includes(packageName) && packageName !== this.name;
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

function isDirectory(filePath: string): boolean {
  try {
    return lstatSync(filePath).isDirectory();
  } catch (e) {
    return false;
  }
}
