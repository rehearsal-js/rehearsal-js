// Helper utils for Ember
import { isEmberApp, isEmberEngine, isEmberAddon } from '@rehearsal/migration-graph-ember';
import { PackageJson } from '@rehearsal/migration-graph-shared';
import { gte } from 'semver';

import execa = require('execa');

import { addDep, getPathToBinary } from '../utils';

const GREEN_MARK = '✅';
const RED_MARK = '❌';

/**
 * Check if it's an ember project
 */
export function isEmber(packageJson: PackageJson): boolean {
  return isEmberApp(packageJson) || isEmberAddon(packageJson) || isEmberEngine(packageJson);
}

/**
 * Check if an Ember project meets the requirements of Glint
 */
export async function validateEmberProject(
  packageJson: PackageJson,
  basePath: string
): Promise<boolean | Error> {
  const MIN_EMBER_VERSION = '3.24.0';
  const MIN_EMBER_MODIFIER_VERSION = '3.2.7';
  const MIN_NODE_VERSION = '16.0.0';
  const emberVersion = packageJson.devDependencies['ember-source'];
  const emberModifierVersion = packageJson.devDependencies['ember-modifier'];
  const { stdout: nodeVersion } = await execa('node', ['-v'], { cwd: basePath });

  const isNodeValid = gte(trimVersion(nodeVersion), MIN_NODE_VERSION);
  const isEmberValid = gte(trimVersion(emberVersion), MIN_EMBER_VERSION);
  const isEmberModifierValid = gte(trimVersion(emberModifierVersion), MIN_EMBER_MODIFIER_VERSION);
  if (isNodeValid && isEmberValid && isEmberModifierValid) {
    return true;
  } else {
    throw new Error(`Your Ember project does not meet the requirements of migration. Please make sure you have:
    - ${
      isNodeValid ? GREEN_MARK : RED_MARK
    } Project Node Version ${nodeVersion} should >= ${MIN_NODE_VERSION}
    - ${
      isEmberValid ? GREEN_MARK : RED_MARK
    } Dependency ember-source ${emberVersion} should >=${MIN_EMBER_VERSION}
    - ${
      isEmberModifierValid ? GREEN_MARK : RED_MARK
    } Dependency ember-modifier ${emberModifierVersion} should >=${MIN_EMBER_MODIFIER_VERSION}
    `);
  }
}

/**
 *  Install extra dependencies for Ember App/Addon/Engine
 */
export async function installEmberDependencies(basePath: string): Promise<void> {
  await addDep(['@glint/core', '@glint/template', '@glint/environment-ember-loose'], true, {
    cwd: basePath,
  });
  // assuming ember-cli should be always installed in ember app/addon/engine
  const emberCLIBinPath = await getPathToBinary('ember', { cwd: basePath });
  await execa(emberCLIBinPath, ['install', 'ember-cli-typescript@latest'], {
    cwd: basePath,
  });
}

/**
 *  Trim version prefixes like V, ^, ~, etc
 */
function trimVersion(version: string): string {
  return version.trim().replace(/^[=vV^~]+/, '');
}
