import { Project } from 'fixturify-project';
import { dirname, join } from 'path';
import merge from 'lodash.merge';
import tmp from 'tmp';
import { execSync } from 'child_process';
import { existsSync } from 'fs-extra';

tmp.setGracefulCleanup();

import {
  getEmberAppFiles,
  getEmberAppWithInRepoAddonFiles,
  getEmberAddonFiles,
  getEmberAppWithInRepoEngine,
} from './files';
import rimraf from 'rimraf';

// this scenario represents the last Ember 3.x release
export async function ember3(_project: Project) {}

export function getEmberAppProject(project: Project = emberAppTemplate()): Project {
  merge(project.files, getEmberAppFiles());
  return project;
}

/**
 * Augments the project to have an in-repo addon with an acceptance test to evalute the composition.
 * @param {Project} project
 * @param {string} [addonName='some-addon']
 */
export function getEmberAppWithInRepoAddonProject(
  project: Project = emberAppTemplate(),
  addonName = 'some-addon'
) {
  getEmberAppProject(project);

  // augment package.json with
  project.pkg['ember-addon'] = {
    paths: [`lib/${addonName}`],
  };

  merge(project.files, getEmberAppWithInRepoAddonFiles(addonName));

  return project;
}

export function getEmberAppWithInRepoEngineProject(
  project: Project = emberAppTemplate(),
  engineName = 'some-engine'
): Project {
  getEmberAppProject(project);

  project.pkg['ember-addon'] = {
    paths: [`lib/${engineName}`],
  };
  project.addDevDependency('ember-engines', '0.8.23');

  merge(project.files, getEmberAppWithInRepoEngine(engineName));

  return project;
}

export function getEmberAddonProject(project: Project = emberAddonTemplate()) {
  // For now we are only making compat tests for ember-source >=3.24 and < 4.0
  // Add acceptance test for validating that our engine is mounted and routable;
  merge(project.files, getEmberAddonFiles());
  return project;
}

export function emberAddonTemplate(as: 'addon' | 'dummy-app' = 'addon') {
  const sourceDir = dirname(require.resolve('./ember/addon-template/package.json'));

  return Project.fromDir(sourceDir, {
    linkDeps: true,
    linkDevDeps: as === 'dummy-app',
  });
}

export function emberAppTemplate() {
  const sourceDir = dirname(require.resolve('./ember/app-template/package.json'));

  return Project.fromDir(sourceDir, {
    linkDevDeps: false,
  });
}

function prepare(dir: string): void {
  if (!existsSync(join(dir, 'node_modules'))) {
    console.log(`Initializing fixture directory: ${dir}`);
    // The (app|addon)-template needs a node_modules directory for
    // `Project.fromDir()` (fixturify-project) to work.
    execSync(`npm --version && npm install`, {
      cwd: dir,
      stdio: 'ignore', // Otherwise this will output warning from install command
    });
  }
}

export function testSetup() {
  prepare(dirname(require.resolve('./ember/app-template/package.json')));
  prepare(dirname(require.resolve('./ember/addon-template/package.json')));
}

export async function setupProject(project: Project) {
  const { name: tmpDir } = tmp.dirSync();
  project.baseDir = tmpDir;
  await project.write();
  return project;
}
