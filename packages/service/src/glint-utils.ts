import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { RehearsalService } from './rehearsal-service.js';
import type { GlintService } from './glint-service.js';
import type { PackageJson } from 'type-fest';

// The list of extensions that we expect to be handled by Glint{Fix,Check} plugins. Note that
// in any ember/glimmer project, we'll use the glint *service* for all files. This list is only
// indicating which extensions are handled by the plugins
export const GLINT_EXTENSIONS = ['.gts', '.hbs'];

// The list of dependencies we look for to determine if we're in a glint project. If we find one
// of these, we use glint. Otherwise, we use the regular Rehearsal service
export const GLINT_PROJECT_FILES = ['ember-source', '@glimmer/component', '@glimmerx/component'];

export function isApp(packageJson: PackageJson): boolean {
  return hasDevDependency(packageJson, 'ember-source') && !isAddon(packageJson);
}

function hasDevDependency(packageJson: PackageJson, packageName: string): boolean {
  return !!(packageJson?.devDependencies && packageName in packageJson.devDependencies) ?? false;
}

export function isAddon(packageJson: PackageJson): boolean {
  return hasKeyword(packageJson, 'ember-addon');
}

function hasKeyword(packageJson: PackageJson, keyword: string): boolean {
  return !!(
    packageJson?.keywords &&
    Array.isArray(packageJson.keywords) &&
    packageJson.keywords.includes(keyword)
  );
}

export async function isGlintProject(basePath: string): Promise<boolean> {
  const pkgPath = resolve(basePath, 'package.json');
  let pkgJson: string;

  try {
    pkgJson = await readFile(pkgPath, 'utf-8');
  } catch (err) {
    throw new Error(`There was an issue reading the package.json file located at ${pkgPath}`);
  }

  const pkg = JSON.parse(pkgJson) as PackageJson;
  const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];

  return deps.some((pkgName) => {
    return GLINT_PROJECT_FILES.includes(pkgName);
  });
}

export function fileContainsHbsImport(fileText: string): boolean {
  const lines = fileText.split('\n');
  const regex =
    /import\s+.*\{.*hbs.*\}\s+from\s+["'](?:@glimmerx\/component)|(?:ember-cli-htmlbars)["']/;
  return lines.some((line) => {
    return regex.test(line);
  });
}

export function isGlintFile(service: GlintService, fileName: string): boolean {
  return (
    GLINT_EXTENSIONS.includes(extname(fileName)) ||
    fileContainsHbsImport(service.getFileText(fileName))
  );
}

export function isGlintService(
  service: GlintService | RehearsalService,
  useGlint: boolean
): service is GlintService {
  return service && useGlint;
}
