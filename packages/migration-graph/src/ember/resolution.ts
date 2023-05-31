import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  parseSync,
  Node,
  AssignmentExpression,
  MemberExpression,
  Identifier,
  KeyValueProperty,
  MethodProperty,
  StringLiteral,
  FunctionExpression,
  ArrowFunctionExpression,
  BlockStatement,
  ReturnStatement,
  Property,
  SpreadElement,
} from '@swc/core';

import debugFactory from 'debug';
import { EmberSpecificPackageJson, readPackageJson } from '../utils/read-package-json.js';
import { findPackageJson } from '../utils/find-package-json.js';
import type enhancedResolve from 'enhanced-resolve';
import type * as Swc from '@swc/core/Visitor.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const Visitor = require('@swc/core/Visitor.js').Visitor as typeof Swc.Visitor;

const debug = debugFactory('rehearsal:resolution');

export function emberSpecificAliases(
  root: string,
  packageName: string,
  pkgJson: EmberSpecificPackageJson
): string[] | undefined {
  if (packageName === 'ember-source') {
    return emberAliases(root);
  } else if (packageName.startsWith('@ember-data')) {
    return emberDataAliases(root);
  } else if (isEmberAddon(root, pkgJson)) {
    return emberAddonAliases(root);
  }
}

export function emberSpecificPaths(
  aliases: string[],
  resolver: enhancedResolve.ResolveFunction,
  root: string
): Record<string, string[]> {
  if (aliases.includes('ember')) {
    return emberPaths(aliases);
  }

  if (aliases.includes('@ember-data/model')) {
    const sourcePaths = aliases.map((dep) => {
      const resolved = resolver(root, dep);
      assert(resolved);
      return relative(root, resolved);
    });
    return emberDataPaths(aliases, sourcePaths);
  }

  const paths: Record<string, string[]> = {};

  for (const alias of aliases) {
    paths[`${alias}/*`] = ['./addon/*'];
    paths[`${alias}`] = ['./addon/*'];
  }

  return paths;
}

export function emberAddonAliases(packageRoot: string): string[] {
  const packageJson = readPackageJson(join(packageRoot, 'package.json'));

  assert(packageJson.name);

  try {
    if (isEmberAddon(packageRoot, packageJson)) {
      const require = createRequire(packageRoot);
      const resolvedMain = require.resolve(packageJson.name);
      const moduleName = findModuleName(resolvedMain);

      if (!moduleName) {
        debug(`DEOPT: using runtime resolution on ${resolvedMain}`);
        const mainModule = require(resolvedMain) as EmberMain;

        const name = mainModule.moduleName?.() || mainModule.name;

        if (name) {
          return [name, packageJson.name];
        }

        return [packageJson.name];
      }

      debug(`parsed out ${resolvedMain} -> ${moduleName}`);

      return [packageJson.name, moduleName];
    }
  } catch (e) {
    // swallow the error
  }
  return [packageJson.name];
}

// es modules and type mismatch

class EmberVisitor extends Visitor {
  moduleName: string | undefined = undefined;
  inModuleExports = false;

  get isDescending(): boolean {
    return this.inModuleExports || this.moduleName === undefined;
  }

  override visitAssignmentExpression(n: AssignmentExpression): AssignmentExpression {
    if (
      isMemberExpression(n.left) &&
      isIdentifier(n.left.object) &&
      isIdentifier(n.left.property) &&
      n.left.object.value === 'module' &&
      n.left.property.value === 'exports'
    ) {
      this.inModuleExports = true;
      this.visitExpression(n.right);
    }

    return n;
  }

  override visitKeyValueProperty(n: KeyValueProperty): KeyValueProperty {
    if (!this.isDescending) {
      return n;
    }

    if (
      this.moduleName === undefined &&
      isIdentifier(n.key) &&
      n.key.value === 'name' &&
      isStringLiteral(n.value)
    ) {
      this.moduleName = n.value.value;
    } else if (isIdentifier(n.key) && n.key.value === 'moduleName') {
      if (isArrowFunctionExpression(n.value)) {
        if (isStringLiteral(n.value.body)) {
          this.moduleName = n.value.body.value;
          this.inModuleExports = false;
        } else if (isBlockStatement(n.value.body)) {
          this.visitBlockStatement(n.value.body);
        }
      } else if (isFunctionExpression(n.value)) {
        if (n.value.body) {
          this.visitBlockStatement(n.value.body);
        }
      }
    }

    return n;
  }

  override visitMethodProperty(n: MethodProperty): SpreadElement | Property {
    if (!this.isDescending) {
      return n;
    }

    if (isIdentifier(n.key) && n.key.value === 'moduleName') {
      if (n.body) {
        this.visitBlockStatement(n.body);
      }
    }

    return n;
  }

  override visitBlockStatement(n: BlockStatement): BlockStatement {
    if (!this.isDescending) {
      return n;
    }

    for (const stmt of n.stmts) {
      if (isReturnStatement(stmt) && stmt.argument && isStringLiteral(stmt.argument)) {
        this.moduleName = stmt.argument.value;
        this.inModuleExports = false;
        break;
      }
    }

    return n;
  }
}

export function findModuleName(emberMain: string): string | undefined {
  const parsed = parseSync(readFileSync(emberMain, 'utf-8'));

  const moduleItems = parsed.body.filter((node) => node.type === 'ExpressionStatement');

  const visitor = new EmberVisitor();

  visitor.visitModuleItems(moduleItems);

  return visitor.moduleName;
}

function isReturnStatement(node: Node): node is ReturnStatement {
  return node.type === 'ReturnStatement';
}

function isArrowFunctionExpression(node: Node): node is ArrowFunctionExpression {
  return node.type === 'ArrowFunctionExpression';
}

function isFunctionExpression(node: Node): node is FunctionExpression {
  return node.type === 'FunctionExpression';
}

function isBlockStatement(node: Node): node is BlockStatement {
  return node.type === 'BlockStatement';
}

function isStringLiteral(node: Node): node is StringLiteral {
  return node.type === 'StringLiteral';
}

function isMemberExpression(node: Node): node is MemberExpression {
  return node.type === 'MemberExpression';
}

function isIdentifier(node: Node): node is Identifier {
  return node.type === 'Identifier';
}
interface EmberMain {
  name?: string;
  moduleName?(): string;
}

function hasEmberAddonDirectoryConventions(root: string): boolean {
  return existsSync(join(root, 'addon'));
}

export function isEmberAddon(root: string, packageJson: EmberSpecificPackageJson): boolean {
  return !!(
    packageJson.keywords?.includes('ember-addon') && hasEmberAddonDirectoryConventions(root)
  );
}

export function emberAliases(root: string): string[] {
  const modulesRoot = join(root, 'dist', 'packages', '@ember');
  const packages = readdirSync(modulesRoot, { withFileTypes: true })
    .filter((file) => file.isDirectory())
    .map((pkg) => `@ember/${pkg.name}`);
  return [...packages, 'ember', 'rsvp', '@ember/owner', 'ember-source'];
}

export function emberPaths(aliases: string[]): Record<string, string[]> {
  const paths: Record<string, string[]> = {};

  // assume all of ember is typed
  for (const alias of aliases) {
    paths[alias] = ['./dist/packages/ember'];
  }

  return paths;
}

export function emberDataPaths(aliases: string[], sourcePaths: string[]): Record<string, string[]> {
  const paths: Record<string, string[]> = {};

  for (let i = 0; i < aliases.length; i++) {
    const alias = aliases[i];
    const sourcePath = sourcePaths[i];
    paths[`${alias}/*`] = [`${sourcePath}/*`];
    paths[`${alias}`] = [`${sourcePath}`];
  }

  return paths;
}

export function emberDataAliases(root: string): string[] {
  const pkgJsonPath = findPackageJson(root);

  assert(pkgJsonPath);

  const pkgJson = readPackageJson(pkgJsonPath);

  const emberDataAliases = Object.keys({
    ...pkgJson.dependencies,
  }).filter((dep) => dep.startsWith('@ember-data'));

  emberDataAliases.push('ember-data');
  return emberDataAliases;
}
