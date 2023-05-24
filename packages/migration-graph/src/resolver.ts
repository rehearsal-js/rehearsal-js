import { basename, dirname, extname, resolve } from 'node:path';
import assert from 'node:assert';
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import tsConfigPaths, { MatchPath } from 'tsconfig-paths';
import { preprocessEmbeddedTemplates } from 'ember-template-imports/lib/preprocess-embedded-templates.js';
import { init, parse } from 'es-module-lexer';
import debugFactory from 'debug';
import { transformSync } from '@swc/core';
import micromatch from 'micromatch';
import { PackageJson } from 'type-fest';
import enhancedResolve from 'enhanced-resolve';
import { readPackageJson } from './utils/read-package-json.js';
import { PackageGraph } from './project-graph.js';
import { emberSpecificPaths, emberSpecificAliases } from './ember/resolution.js';
import { PackageNode, PackageOptions } from './package-node.js';
import { findPackageJson } from './utils/find-package-json.js';
import { findTsConfig } from './utils/find-tsconfig.js';
import type { ImportScanner } from './types.js';

const debug = debugFactory('rehearsal:package-graph:');

export const SUPPORTED_TS_EXTENSIONS = ['.ts', '.gts', '.tsx', '.mts'] as const;
export const SUPPORTED_JS_EXTENSIONS = ['.js', '.gjs', '.jsx', '.mjs'] as const;

export const SUPPORTED_EXTENSION = [
  ...SUPPORTED_TS_EXTENSIONS,
  ...SUPPORTED_JS_EXTENSIONS,
  '.hbs',
] as const;

export interface ResolverOptions {
  rootPath: string;
  scanForImports?: ImportScanner;
  ignore?: string[];
  includeExternals: boolean;
}

export class Resolver {
  graph: PackageGraph = new PackageGraph();
  private scanForImports?: ImportScanner;
  private ignorePatterns: string[];
  private fileResolver: enhancedResolve.ResolveFunction;
  private includeExternals: boolean;

  private readonly supportedTSExtensions = [...SUPPORTED_TS_EXTENSIONS, '.d.ts'];
  private readonly supportedExtensions = [
    ...SUPPORTED_JS_EXTENSIONS,
    ...this.supportedTSExtensions,
  ];

  constructor(options: ResolverOptions) {
    this.ignorePatterns = ['**/*.hbs', ...(options?.ignore ?? [])];
    this.scanForImports = options?.scanForImports;
    this.includeExternals = options.includeExternals;
    this.fileResolver = enhancedResolve.create.sync({
      mainFields: ['main', 'types', 'typings'],
      resolveToContext: true,
    });
  }

  async load(): Promise<void> {
    await init;
  }

  walk(importerAbsPath: string): void {
    const packageRootPath = findPackageJson(dirname(importerAbsPath));

    assert(packageRootPath, `Could not find package.json for ${importerAbsPath}`);

    const pkgJson = readPackageJson(packageRootPath);

    assert(
      pkgJson.name,
      `Package.json for ${importerAbsPath} is missing the 'name' field but it is required.`
    );

    if (
      this.graph.hasFile(pkgJson.name, importerAbsPath) ||
      this.ignorePatterns.includes(pkgJson.name) ||
      micromatch.contains(importerAbsPath, this.ignorePatterns)
    ) {
      // We have walked this whole subgraph already. Exit out.
      return;
    }

    const pkgName = pkgJson.name;
    debug(`walking: ${importerAbsPath} in ${pkgName}`);

    const packageNode = this.graph.addPackage(this.getPackageOptionsFor(importerAbsPath));

    this.graph.addFileToPackage(packageNode, importerAbsPath);

    const contentType = this.getContentType(importerAbsPath);
    const content = this.preprocessFileContents(importerAbsPath);

    const resolvedImports = this.scanForImports?.(contentType, content) ?? [];
    const [imports] = parse(content);

    const allImports = [
      ...imports.map((imp) => imp.n).filter(onlyImportSources),
      ...resolvedImports,
    ];

    allImports.forEach((importee) => {
      const importeeAbsPath = this.resolveImportee(importerAbsPath, importee);
      if (importeeAbsPath) {
        this.attachDependency(pkgName, importerAbsPath, importeeAbsPath);
      } else {
        debug(`attempting resolve missing: from ${importerAbsPath} -> ${importee}`);
        if (this.includeExternals) {
          this.attachFromPackageJson(packageRootPath, pkgJson, importerAbsPath, importee);
        }
      }
    });
  }

  private attachDependency(
    importerPkgName: string,
    importerAbsPath: string,
    importeeAbsPath: string
  ): void {
    if (this.isInternalPath(importeeAbsPath)) {
      this.attachInternalDependency(importerPkgName, importerAbsPath, importeeAbsPath);
    } else if (this.includeExternals) {
      this.attachExternalDependency(importerPkgName, importerAbsPath, importeeAbsPath);
    }
  }

  private isSymlink(directoryPath: string): boolean {
    return lstatSync(directoryPath).isSymbolicLink();
  }

  private getPackageOptionsFor(importeeAbsPath: string): PackageOptions;
  private getPackageOptionsFor(root: string, dep: string): PackageOptions;
  private getPackageOptionsFor(...args: string[]): PackageOptions {
    let importeeAbsPath: string | undefined;

    const [projectRoot, dep] = args;

    if (args.length === 1) {
      importeeAbsPath = projectRoot;
    }

    if (!importeeAbsPath) {
      const maybeResolved = this.fileResolver(projectRoot, dep);

      assert(maybeResolved);

      importeeAbsPath = maybeResolved;

      if (this.isSymlink(importeeAbsPath)) {
        importeeAbsPath = resolve(dirname(projectRoot), readlinkSync(importeeAbsPath));
      }
    }

    const packagePath = findPackageJson(importeeAbsPath);

    assert(packagePath);

    const root = dirname(packagePath);

    const pkgJson = readPackageJson(packagePath);

    assert(pkgJson.name);

    return {
      type: 'resolved',
      root,
      pkgJson,
      pathResolution: {
        types(aliases: string[]) {
          return aliases.includes('ember-source') || aliases.includes('ember-data');
        },
        extensions: [...SUPPORTED_EXTENSION],
        aliases(pkgName: string): string[] {
          const emberSpecific = emberSpecificAliases(root, pkgName, pkgJson);

          if (emberSpecific) {
            return emberSpecific;
          }

          return [pkgName];
        },

        paths: (aliases: string[]): Record<string, string[]> => {
          const paths = emberSpecificPaths(aliases, this.fileResolver, root);

          // add in paths for normal node_module resolution
          for (const alias of aliases) {
            if (paths[`${alias}`] || paths[`${alias}/*`]) {
              paths[`${alias}`].push('./*');
            }
          }

          return paths;
        },
      },
    };
  }

  /**
   * Creates an edge between packages and files of known internal  packages
   */
  private attachInternalDependency(
    pkgName: string,
    importerAbsPath: string,
    importeeAbsPath: string
  ): void {
    this.walk(importeeAbsPath);

    const toPkg = this.graph.getPackageNameFromFileId(importeeAbsPath);
    if (toPkg) {
      debug(`edge: ${pkgName} -> ${toPkg} and ${importerAbsPath} -> ${importeeAbsPath}`);
      this.graph.addDependency(pkgName, importerAbsPath, toPkg, importeeAbsPath);
    }
  }

  /**
   * Looks through the importer's package.json and attempts to connects the importee to them.
   */
  private attachFromPackageJson(
    packageRootPath: string,
    pkgJson: PackageJson,
    importerAbsPath: string,
    importee: string
  ): void {
    const packageNode = this.discoverFromDependencies(packageRootPath, pkgJson, importee);
    const importeeAbsPath = packageNode.resolvePath(importee);

    assert(pkgJson.name);

    if (importeeAbsPath) {
      this.graph.addFileToPackage(packageNode, importeeAbsPath);
      if (!packageNode.external) {
        this.attachInternalDependency(pkgJson.name, importerAbsPath, importeeAbsPath);
      } else {
        this.graph.addDependency(pkgJson.name, importerAbsPath, packageNode.name, importeeAbsPath);
      }
    } else {
      // some configuration thing is wrong because the file matched but couldnt resolve
      this.graph.addFileToPackage(packageNode, importee);
      this.graph.addDependency(pkgJson.name, importerAbsPath, packageNode.name, importee);
    }
  }

  /**
   * @param importeeAbsPath absolute path to file
   * @returns true if the path goes through node_modules
   */
  private isInternalPath(importeeAbsPath: string): boolean {
    return !importeeAbsPath.includes('node_modules');
  }

  /**
   * Creates dependency from importeer to extenral package. We explicitly do not walk external
   * dependencies.
   */
  private attachExternalDependency(
    importerPkgName: string,
    importerAbsPath: string,
    importeeAbsPath: string
  ): void {
    const externalPackageNode = this.graph.addPackage(this.getPackageOptionsFor(importeeAbsPath));
    this.graph.addFileToPackage(externalPackageNode, importeeAbsPath);
    debug(
      `edge: ${importerPkgName} -> ${externalPackageNode.name} and ${importerAbsPath} -> ${importeeAbsPath}`
    );
    this.graph.addDependency(
      importerPkgName,
      importerAbsPath,
      externalPackageNode.name,
      importeeAbsPath
    );
  }

  /**
   * adds the dependencies of a package to the graph but does not connect it
   */
  private addPackagesFromPackageJson(
    importerPkgRoot: string,
    importerDependencies: string[]
  ): void {
    for (const dep of importerDependencies) {
      try {
        this.graph.addPackage(this.getPackageOptionsFor(importerPkgRoot, dep));
      } catch (e) {
        debug(`resolution error: could not resolve ${dep} from ${importerPkgRoot}`);
        debug(e);
      }
    }
  }

  /**
   * Creates package nodes from things found in package.json
   */
  private discoverFromDependencies(
    importerRoot: string,
    importerPackageJson: PackageJson,
    importee: string
  ): PackageNode {
    const impliedPackageName = this.getPackageName(importee);
    let maybePackageNode = this.graph.getPackageNode(impliedPackageName);

    if (maybePackageNode) {
      return maybePackageNode;
    }

    // start loading the deps we dont have
    const deps = Object.keys({
      ...importerPackageJson.dependencies,
      ...importerPackageJson.devDependencies,
    }).filter((dep) => !this.graph.packages.has(dep));

    this.addPackagesFromPackageJson(importerRoot, deps);

    // try again after all deps loaded
    maybePackageNode = this.graph.getPackageNode(impliedPackageName);

    if (maybePackageNode) {
      return maybePackageNode;
    }

    // missing dep
    return this.graph.addPackage({
      type: 'missing',
      pkgJson: { name: impliedPackageName },
      root: 'node_modules/missing',
    });
  }

  private getPackageName(importee: string): string {
    const parts = importee.split('/');
    let packageName = '';
    if (importee.startsWith('@')) {
      packageName = `${parts[0]}/${parts[1]}`;
    } else {
      packageName = parts[0];
    }

    return packageName;
  }

  private getContentType(filePath: string): 'ecmascript' | 'typescript' {
    const ext = extname(filePath);
    if (this.supportedTSExtensions.includes(ext)) {
      return 'typescript';
    }
    return 'ecmascript';
  }

  private preprocessFileContents(importerAbsPath: string): string {
    const ext = extname(importerAbsPath);
    const contentType = this.getContentType(importerAbsPath);
    const content = readFileSync(importerAbsPath, 'utf-8');

    if (ext === '.gts' || ext === '.gjs') {
      const processed = preprocessEmbeddedTemplates(content, {
        getTemplateLocalsExportPath: '.',
        getTemplateLocalsRequirePath: '.',
        getTemplateLocals() {
          return [];
        },
        templateTag: 'template',
        templateTagReplacement: '__GLIMMER_TEMPLATE',
        relativePath: basename(importerAbsPath),
        includeSourceMaps: false,
        includeTemplateTokens: false,
      }).output;
      return processed;
    } else if (ext === '.tsx' || ext === '.jsx') {
      const { code } = transformSync(content, {
        jsc: { target: 'esnext', parser: { syntax: contentType, jsx: true, decorators: true } },
        isModule: true,
      });
      return code;
    }

    return content;
  }

  /**
   *
   * Resolves the source of import
   *
   * @example
   * ```ts
   * import foo from 'ember';
   * //                 ^
   * //                 Will resolve this to /usr/local/username/projects/project-name/node-modules/ember-source/dist/index.js
   * ```
   *
   *
   * @param importerAbsPath absolute path to file that included the importee
   * @param importee the import source
   * @returns the absolute path to the importee or undefined
   */
  private resolveImportee(importerAbsPath: string, importee: string): string | undefined {
    const packageName = this.graph.getPackageNameFromFileId(importerAbsPath);

    if (packageName) {
      // attempt to resolve internal modules
      const importerPackageNode = this.graph.packages.get(packageName)!;
      const resolvedModule = importerPackageNode.resolvePath(importee);
      if (resolvedModule) {
        return resolvedModule;
      }
    }

    if (importee.startsWith('.')) {
      let importeeAbsPath = this.resolveRelative(importerAbsPath, importee);

      if (importeeAbsPath === undefined) {
        // try index
        importeeAbsPath = this.resolveRelative(importerAbsPath, `${importee}/index`);
      }

      if (importeeAbsPath) {
        debug(`resolve: ${importee} to ${importeeAbsPath}`);
        return importeeAbsPath;
      }
    }

    const config = this.findTSConfig(importerAbsPath);

    if (config.resultType === 'success') {
      const matchPath = this.getMatcher(config);
      let importeeAbsPath: string | undefined;
      // If the import has an extension, we need to resolve imports with an explicit extension since they're required in an ESM environment
      if (importee.endsWith('.js')) {
        importee = importee.slice(0, Math.max(0, importee.length - 3));
        importeeAbsPath =
          matchPath(`${importee}.ts`) ?? matchPath(`${importee}.js`) ?? matchPath(importee);
      } else if (importee.endsWith('.jsx')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        importeeAbsPath =
          matchPath(`${importee}.tsx`) ?? matchPath(`${importee}.jsx`) ?? matchPath(importee);
      } else if (importee.endsWith('.mjs')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        importeeAbsPath =
          matchPath(`${importee}.mts`) ?? matchPath(`${importee}.mjs`) ?? matchPath(importee);
      } else if (importee.endsWith('.gjs')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        importeeAbsPath =
          matchPath(`${importee}.gjs`) ?? matchPath(`${importee}.gjs`) ?? matchPath(importee);
      } else if (importee.endsWith('.gts')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        importeeAbsPath =
          matchPath(`${importee}.gts`) ?? matchPath(`${importee}.gts`) ?? matchPath(importee);
      }
      // If the import is extension-less we re-try each extension type we support. If we have a match we return
      // the first one with the extension
      else {
        importeeAbsPath = this.resolveFromExtensionless(importee, matchPath);
      }

      if (importeeAbsPath !== undefined) {
        debug(`resolve: ${importee} to ${importeeAbsPath}`);
        return importeeAbsPath;
      }
    }
  }

  private resolveRelative(importerAbsPath: string, importee: string): string | undefined {
    const ext = extname(importee);

    if (ext !== '') {
      // We remove the extension here and attempt to resolve
      importee = importee.replace(ext, '');
    }

    return this.resolveFromExtensionless(
      resolve(dirname(importerAbsPath), importee),
      (requestedModule, _parseJson, _exists, extensions = []) => {
        for (const ext of extensions) {
          if (existsSync(requestedModule + ext)) {
            return requestedModule + ext;
          }
        }
      }
    );
  }

  private findTSConfig(absPath: string): tsConfigPaths.ConfigLoaderResult {
    const tsconfigJsonPath = findTsConfig(dirname(absPath));

    assert(tsconfigJsonPath, 'Must have tsconfig.json in the root of the package');

    return tsConfigPaths.loadConfig(tsconfigJsonPath);
  }

  private getMatcher(config: tsConfigPaths.ConfigLoaderSuccessResult): tsConfigPaths.MatchPath {
    const { absoluteBaseUrl, paths } = config;

    let matchPath: MatchPath;

    if (paths === undefined) {
      matchPath = () => undefined;
    } else {
      matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);
    }

    return matchPath;
  }

  /**
   * Tries to match extensionless imports. Special cases where we resolve on a type to see if
   * that type is actaully an internal dependency
   */
  private resolveFromExtensionless(importee: string, matcher: MatchPath): string | undefined {
    let importeeAbsPath = this.attemptToResolveWithExtension(importee, matcher);

    if (!importeeAbsPath) {
      // Check to see if we're pointing at an index file
      importee = `${importee}/index`;
      importeeAbsPath = this.attemptToResolveWithExtension(importee, matcher);
    }

    // If we resolved to a declaration try to lookup and find a resolution
    // within its self for the source
    if (importeeAbsPath?.endsWith('.d.ts')) {
      const config = this.findTSConfig(importeeAbsPath);

      if (config.resultType === 'success') {
        const resolvedFromDts = this.attemptToResolveWithExtension(
          importee,
          this.getMatcher(config)
        );

        if (resolvedFromDts !== importeeAbsPath) {
          importeeAbsPath = resolvedFromDts;
        } else {
          // there is only a .d.ts file for this import
          return importeeAbsPath;
        }
      }
    }

    return importeeAbsPath;
  }

  private attemptToResolveWithExtension(importee: string, matcher: MatchPath): string | undefined {
    for (const ext of this.supportedExtensions) {
      const matchedPath = matcher(importee, undefined, undefined, [ext]);

      if (matchedPath) {
        const extension = extname(matchedPath);
        const cleaned = matchedPath.replace(extension, '');
        const importeeAbsPath = `${cleaned}${ext}`;
        if (existsSync(importeeAbsPath)) {
          return importeeAbsPath;
        }
      }
    }
  }
}

function onlyImportSources(maybeImport: string | undefined): maybeImport is string {
  return maybeImport !== undefined;
}
