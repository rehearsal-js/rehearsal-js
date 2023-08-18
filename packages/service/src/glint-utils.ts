import { extname } from 'node:path';
import type { GlintService } from './glint-service.js';
import type { PackageJson } from 'type-fest';
import { GlintConfig, loadConfig } from '@glint/core';

// The list of extensions that we expect to be handled by Glint{Fix,Check} plugins. Note that
// in any ember/glimmer project, we'll use the glint *service* for all files. This list is only
// indicating which extensions are handled by the plugins
export const GLINT_EXTENSIONS = ['.gts', '.hbs'];

export function isEmberApp(packageJson: PackageJson): boolean {
  return hasDevDependency(packageJson, 'ember-source') && !isEmberAddon(packageJson);
}

function hasDevDependency(packageJson: PackageJson, packageName: string): boolean {
  return !!(packageJson?.devDependencies && packageName in packageJson.devDependencies) ?? false;
}

export function isEmberAddon(packageJson: PackageJson): boolean {
  return hasKeyword(packageJson, 'ember-addon');
}

function hasKeyword(packageJson: PackageJson, keyword: string): boolean {
  return !!(
    packageJson?.keywords &&
    Array.isArray(packageJson.keywords) &&
    packageJson.keywords.includes(keyword)
  );
}

export function tryLoadGlintConfig(fromPath: string): GlintConfig | undefined {
  try {
    return loadConfig(fromPath);
  } catch (e) {
    return undefined;
  }
}

export function isGlintProject(basePath: string): boolean {
  return !!tryLoadGlintConfig(basePath);
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
