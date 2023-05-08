import { basename, dirname, extname, resolve } from 'node:path';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import tsConfigPaths, { MatchPath } from 'tsconfig-paths';
import { preprocessEmbeddedTemplates } from 'ember-template-imports/lib/preprocess-embedded-templates.js';
import { findUpSync } from 'find-up';
import { init, parse } from 'es-module-lexer';
import debugFactory from 'debug';
import { transformSync } from '@swc/core';
import micromatch from 'micromatch';
import { readPackageJson } from './utils/read-package-json.js';
import { PackageGraph } from './project-graph.js';
import type { CustomImportResolver } from './types.js';

const debug = debugFactory('rehearsal:package-graph:');

export const SUPPORTED_TS_EXTENSIONS = ['.ts', '.gts', '.tsx', '.mts'] as const;
export const SUPPORTED_JS_EXTENSIONS = ['.js', '.gjs', '.jsx', '.mjs'] as const;

export const SUPPORTED_EXTENSION = [
  ...SUPPORTED_TS_EXTENSIONS,
  ...SUPPORTED_JS_EXTENSIONS,
] as const;

export interface ResolverOptions {
  customResolver?: CustomImportResolver;
  ignore?: string[];
}

export class Resolver {
  graph: PackageGraph = new PackageGraph();
  private resolver?: CustomImportResolver;
  private ignorePatterns: string[];

  private readonly supportedTSExtensions = [...SUPPORTED_TS_EXTENSIONS, '.d.ts'];
  private readonly supportedExtensions = [
    ...SUPPORTED_JS_EXTENSIONS,
    ...this.supportedTSExtensions,
  ];

  constructor(options?: ResolverOptions) {
    this.ignorePatterns = options?.ignore ?? [];
    this.resolver = options?.customResolver;
  }

  async load(): Promise<void> {
    await init;
  }

  walk(filePath: string): void {
    const packageJsonPath = findUpSync('package.json', {
      cwd: dirname(filePath),
    });

    assert(packageJsonPath, `Could not find package.json for ${filePath}`);

    const pkgJson = readPackageJson(packageJsonPath);

    assert(
      pkgJson.name,
      `Package.json for ${filePath} is missing the 'name' field but it is required.`
    );

    if (
      this.graph.hasFile(pkgJson.name, filePath) ||
      this.ignorePatterns.includes(pkgJson.name) ||
      micromatch.contains(filePath, this.ignorePatterns)
    ) {
      // We have walked this whole subgraph already. Exit out.
      return;
    }

    debug(`walking: ${filePath} in ${pkgJson.name}`);

    this.graph.addFileToPackage(packageJsonPath, filePath);

    const contentType = this.getContentType(filePath);
    const content = this.preprocessFileContents(filePath);

    const resolvedImports = this.resolver?.(contentType, content) ?? [];
    const [imports] = parse(content);

    const allImports = [
      ...imports.map((imp) => imp.n).filter(onlyImportSources),
      ...resolvedImports,
    ];

    allImports.forEach((imp) => {
      const resolved = this.resolveModule(filePath, imp);

      if (resolved) {
        this.walk(resolved);

        const toPkg = this.graph.getPackageNameFromFileId(resolved);
        if (toPkg) {
          assert(
            pkgJson.name,
            `Package.json for ${filePath} is missing the 'name' field but it is required.`
          );
          debug(`edge: ${pkgJson.name} -> ${toPkg} and ${filePath} -> ${resolved}`);
          this.graph.addDependency(pkgJson.name, filePath, toPkg, resolved);
        }
      }
    });
  }

  private getContentType(filePath: string): 'ecmascript' | 'typescript' {
    const ext = extname(filePath);
    if (this.supportedTSExtensions.includes(ext)) {
      return 'typescript';
    }
    return 'ecmascript';
  }

  private preprocessFileContents(filePath: string): string {
    const ext = extname(filePath);
    const contentType = this.getContentType(filePath);
    const content = readFileSync(filePath, 'utf-8');

    if (ext === '.gts' || ext === '.gjs') {
      return preprocessEmbeddedTemplates(content, {
        getTemplateLocalsExportPath: '.',
        getTemplateLocalsRequirePath: '.',
        getTemplateLocals() {
          return [];
        },
        templateTag: 'template',
        templateTagReplacement: '__GLIMMER_TEMPLATE',
        relativePath: basename(filePath),
        includeSourceMaps: false,
        includeTemplateTokens: false,
      }).output;
    } else if (ext === '.tsx' || ext === '.jsx') {
      const { code } = transformSync(content, {
        jsc: { target: 'esnext', parser: { syntax: contentType, jsx: true, decorators: true } },
        isModule: true,
      });
      return code;
    }

    return content;
  }

  private resolveModule(importer: string, importee: string): string | undefined {
    if (importee.startsWith('.')) {
      let resolved = this.resolveRelative(importer, importee);

      if (resolved === undefined) {
        // try index
        resolved = this.resolveRelative(importer, `${importee}/index`);
      }

      assert(
        resolved,
        `Invariant: ${importee} is not resolvable. ${importee} was imported from ${importer} but cannot be resolved.`
      );
      debug(`resolve: ${importee} to ${resolved}`);
      // relative path
      return resolved;
    }

    const config = this.findTSConfig(importer);

    if (config.resultType === 'success') {
      const matchPath = this.getMatcher(config);
      let matchedPath: string | undefined;
      // If the import has an extension, we need to resolve imports with an explicit extension since they're required in an ESM environment
      if (importee.endsWith('.js')) {
        importee = importee.slice(0, Math.max(0, importee.length - 3));
        matchedPath =
          matchPath(`${importee}.ts`) ?? matchPath(`${importee}.js`) ?? matchPath(importee);
      } else if (importee.endsWith('.jsx')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        matchedPath =
          matchPath(`${importee}.tsx`) ?? matchPath(`${importee}.jsx`) ?? matchPath(importee);
      } else if (importee.endsWith('.mjs')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        matchedPath =
          matchPath(`${importee}.mts`) ?? matchPath(`${importee}.mjs`) ?? matchPath(importee);
      } else if (importee.endsWith('.gjs')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        matchedPath =
          matchPath(`${importee}.gjs`) ?? matchPath(`${importee}.gjs`) ?? matchPath(importee);
      } else if (importee.endsWith('.gts')) {
        importee = importee.slice(0, Math.max(0, importee.length - 4));
        matchedPath =
          matchPath(`${importee}.gts`) ?? matchPath(`${importee}.gts`) ?? matchPath(importee);
      }
      // If the import is extension-less we re-try each extension type we support. If we have a match we return
      // the first one with the extension
      else {
        matchedPath = this.resolveFromExtensionless(importee, matchPath);
      }

      if (matchedPath !== undefined) {
        debug(`resolve: ${importee} to ${matchedPath}`);
        return matchedPath;
      }
    }

    debug(`resolve: FAILED ${importee}`);
  }

  private resolveRelative(importer: string, importee: string): string | undefined {
    const ext = extname(importee);

    if (ext !== '') {
      // We remove the extension here and attempt to resolve
      importee = importee.replace(ext, '');
    }

    return this.resolveFromExtensionless(
      resolve(dirname(importer), importee),
      (requestedModule, _parseJson, _exists, extensions = []) => {
        for (const ext of extensions) {
          if (existsSync(requestedModule + ext)) {
            return requestedModule + ext;
          }
        }
      }
    );
  }

  private findTSConfig(filePath: string): tsConfigPaths.ConfigLoaderResult {
    // TODO don't do this for every file build a hash
    const tsconfigJsonPath = findUpSync('tsconfig.json', {
      cwd: dirname(filePath),
    });

    assert(tsconfigJsonPath, 'Must have tsconfig.json in the root of the package');

    const config = tsConfigPaths.loadConfig(tsconfigJsonPath);

    if (config.resultType === 'success') {
      // clean the paths from things pointing to node_modules
      Object.entries(config.paths).forEach(([key, entries]) => {
        const newEntries = entries.filter((entry) => !entry.includes('node_modules'));
        config.paths[key] = newEntries;
      });
    }

    return config;
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

  private resolveFromExtensionless(importee: string, matcher: MatchPath): string | undefined {
    let resolved = this.attemptToResolveWithExtension(importee, matcher);

    if (!resolved) {
      // Check to see if we're pointing at an index file
      importee = `${importee}/index`;
      resolved = this.attemptToResolveWithExtension(importee, matcher);
    }

    // If we resolved to a declaration try to lookup and find a resolution
    // within its self for the source
    if (resolved?.endsWith('.d.ts')) {
      const config = this.findTSConfig(resolved);

      if (config.resultType === 'success') {
        const resolvedFromDts = this.attemptToResolveWithExtension(
          importee,
          this.getMatcher(config)
        );

        if (resolvedFromDts !== resolved) {
          resolved = resolvedFromDts;
        } else {
          // there is only a .d.ts file for this import, don't include it in graph
          return undefined;
        }
      }
    }

    return resolved;
  }

  private attemptToResolveWithExtension(importee: string, matcher: MatchPath): string | undefined {
    for (const ext of this.supportedExtensions) {
      const matchedPath = matcher(importee, undefined, undefined, [ext]);

      if (matchedPath) {
        const extension = extname(matchedPath);
        const cleaned = matchedPath.replace(extension, '');
        const filePath = `${cleaned}${ext}`;
        if (existsSync(filePath)) {
          return filePath;
        }
      }
    }
  }
}

function onlyImportSources(maybeImport: string | undefined): maybeImport is string {
  return maybeImport !== undefined;
}
