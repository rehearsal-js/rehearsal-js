import { resolve } from 'node:path';
import { readFileSync, readdirSync, promises as fs, existsSync } from 'node:fs';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  getEmberAppProject,
  getEmberAppWithInRepoAddonProject,
  getEmberAppWithInRepoEngineProject,
} from '@rehearsal/test-support';
import { readJSONSync } from 'fs-extra/esm';
import { TSConfig } from '../../../src/types.js';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';
import { runBin } from '../../test-helpers/index.js';
import type { Project } from 'fixturify-project';
import type { PackageJson } from 'type-fest';

describe('migrate - ember app: e2e', () => {
  describe('ember app', () => {
    let project: Project;

    beforeAll(async () => {
      project = getEmberAppProject();
      await project.write();

      await runBin('migrate', ['--ci'], {
        cwd: project.baseDir,
      });
    });

    afterAll(() => {
      project.dispose();
    });

    test('should have the correct files in the base directory', async () => {
      expectFilesExist(project.baseDir, ['ember-cli-build.js', 'testem.js', '.ember-cli']);
      await verifyPackageJson(project.baseDir);
      verifyReport(project.baseDir);
      verifyTsConfig(project.baseDir);
    });

    test('should have the correct files in the app directory', () => {
      verifyApp(project.baseDir);
    });

    test('should have the correct files in the app components directory', () => {
      verifyAppComponents(project.baseDir);
    });

    test('should have the correct files in the app services directory', () => {
      verifyAppServices(project.baseDir);
    });

    test('should have the correct files in the app templates directory', () => {
      verifyAppTemplates(project.baseDir);
    });

    test('should have the correct files in the tests directory', () => {
      verifyTests(project.baseDir);
    });
  });

  describe('ember app with in-repo addon', () => {
    let project: Project;

    beforeAll(async () => {
      project = getEmberAppWithInRepoAddonProject();
      await project.write();

      await runBin('migrate', ['--ci'], {
        cwd: project.baseDir,
      });
    });

    afterAll(() => {
      project.dispose();
    });

    test('should have the correct files in the base directory', async () => {
      expectFilesExist(project.baseDir, ['ember-cli-build.js', 'testem.js', '.ember-cli']);
      await verifyPackageJson(project.baseDir);
      verifyReport(project.baseDir);
      verifyTsConfig(project.baseDir);
    });

    test('should have the correct files in the app directory', () => {
      verifyApp(project.baseDir);
    });

    test('should have the correct files in the app components directory', () => {
      verifyAppComponents(project.baseDir);
    });

    test('should have the correct files in the app templates directory', () => {
      verifyAppTemplates(project.baseDir);
    });

    test('should have the correct files in the tests directory', () => {
      verifyTests(project.baseDir);
    });

    test('should have the correct files in the lib some-addon directory', () => {
      const someAddonPath = resolve(project.baseDir, 'lib', 'some-addon');
      const someAddonFiles = readdirSync(someAddonPath);
      expect(someAddonFiles).toContain('index.js');
      expect(someAddonFiles).toContain('package.json');

      const innerAddonComponentsPath = resolve(
        project.baseDir,
        'lib',
        'some-addon',
        'addon',
        'components'
      );
      const innerAddonComponentsFiles = readdirSync(innerAddonComponentsPath);
      expect(innerAddonComponentsFiles).toContain('greet.ts');
      expect(
        readFileSync(resolve(innerAddonComponentsPath, 'greet.ts'), { encoding: 'utf-8' })
      ).toMatchSnapshot();

      const innerAppComponentsPath = resolve(
        project.baseDir,
        'lib',
        'some-addon',
        'app',
        'components'
      );
      const innerAppComponentsFiles = readdirSync(innerAppComponentsPath);
      expect(innerAppComponentsFiles).toContain('greet.js');
    });
  });

  describe('ember app with in-repo engine', () => {
    let project: Project;

    beforeAll(async () => {
      project = getEmberAppWithInRepoEngineProject();
      await project.write();

      await runBin('migrate', ['--ci'], {
        cwd: project.baseDir,
      });
    });

    afterAll(() => {
      project.dispose();
    });

    test('should have the correct files in the base directory', async () => {
      expectFilesExist(project.baseDir, ['ember-cli-build.js', 'testem.js', '.ember-cli']);
      await verifyPackageJson(project.baseDir);
      verifyReport(project.baseDir);
      verifyTsConfig(project.baseDir);
    });

    test('should have the correct files in the app directory', () => {
      verifyApp(project.baseDir);
    });

    test('should have the correct files in the app components directory', () => {
      verifyAppComponents(project.baseDir);
    });

    test('should have the correct files in the app templates directory', () => {
      verifyAppTemplates(project.baseDir);
    });

    test('should have the correct files in the tests directory', () => {
      verifyTests(project.baseDir);
    });

    test('should have the correct files in the lib some-engine directory', () => {
      const someEnginePath = resolve(project.baseDir, 'lib', 'some-engine');
      const someEngineFiles = readdirSync(someEnginePath);
      expect(someEngineFiles).toContain('index.js');
      expect(someEngineFiles).toContain('package.json');

      const someEngineAddonPath = resolve(project.baseDir, 'lib', 'some-engine', 'addon');
      const someEngineAddonFiles = readdirSync(someEngineAddonPath);
      expect(someEngineAddonFiles).toContain('routes.ts');
      expect(someEngineAddonFiles).toContain('engine.ts');
      expect(someEngineAddonFiles).toContain('resolver.ts');
      expect(
        readFileSync(resolve(someEngineAddonPath, 'routes.ts'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(someEngineAddonPath, 'engine.ts'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(someEngineAddonPath, 'resolver.ts'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
    });

    test('should have the correct files in the lib some-engine addon templates directory', () => {
      const someEngineAddonTemplatesPath = resolve(
        project.baseDir,
        'lib',
        'some-engine',
        'addon',
        'templates'
      );
      const someEngineAddonTemplatesFiles = readdirSync(someEngineAddonTemplatesPath);
      expect(someEngineAddonTemplatesFiles).toContain('application.hbs');
      expect(someEngineAddonTemplatesFiles).toContain('index.hbs');
      expect(someEngineAddonTemplatesFiles).toContain('some-page.hbs');
      expect(
        readFileSync(resolve(someEngineAddonTemplatesPath, 'application.hbs'), {
          encoding: 'utf-8',
        })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(someEngineAddonTemplatesPath, 'index.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(someEngineAddonTemplatesPath, 'some-page.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();

      const someEngineConfigPath = resolve(project.baseDir, 'lib', 'some-engine', 'config');
      const someEngineConfigFiles = readdirSync(someEngineConfigPath);
      expect(someEngineConfigFiles).toContain('environment.js');
    });
  });
});

function expectFilesExist(path: string, filesArray: string[]): void {
  const fileList = readdirSync(path);

  for (const file of filesArray) {
    expect(fileList).toContain(file);
  }
}

async function verifyPackageJson(basePath: string): Promise<void> {
  const packageJson = JSON.parse(
    await fs.readFile(resolve(basePath, 'package.json'), 'utf-8')
  ) as PackageJson;
  expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

  const devDeps = packageJson.devDependencies;
  for (const requiredDep of REQUIRED_DEPENDENCIES) {
    expect(Object.keys(devDeps || {})).toContain(requiredDep);
  }
}

function verifyReport(basePath: string): void {
  const reportPath = resolve(basePath, '.rehearsal');
  const sarifPath = resolve(reportPath, 'migrate-report.sarif');
  const jsonPath = resolve(reportPath, 'migrate-report.json');
  expect(existsSync(sarifPath)).toBeTruthy();
  expect(existsSync(jsonPath)).toBeTruthy();
}

function verifyTsConfig(basePath: string): void {
  const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'), {
    encoding: 'utf-8',
  }) as TSConfig;
  expect(tsConfig).matchSnapshot();
}

function verifyApp(basePath: string): void {
  const appPath = resolve(basePath, 'app');
  const appFiles = readdirSync(appPath);
  expect(appFiles).toContain('app.ts');
  expect(appFiles).not.toContain('app.js');
  expect(appFiles).toContain('router.ts');
  expect(appFiles).not.toContain('router.js');
  expect(appFiles).toContain('index.html');

  expect(readFileSync(resolve(appPath, 'app.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(appPath, 'router.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
}

function verifyAppComponents(basePath: string): void {
  const componentsPath = resolve(basePath, 'app', 'components');
  const componentsFiles = readdirSync(componentsPath);
  expect(componentsFiles).toContain('salutation.ts');
  expect(componentsFiles).not.toContain('salutation.js');
  expect(componentsFiles).toContain('salutation.hbs');

  expect(
    readFileSync(resolve(componentsPath, 'salutation.ts'), { encoding: 'utf-8' })
  ).toMatchSnapshot();
}

function verifyAppServices(basePath: string): void {
  const servicesPath = resolve(basePath, 'app', 'services');
  const servicesFiles = readdirSync(servicesPath);
  expect(servicesFiles).toContain('locale.ts');
  expect(servicesFiles).not.toContain('locale.js');

  expect(readFileSync(resolve(servicesPath, 'locale.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
}

function verifyAppTemplates(basePath: string): void {
  const templatesPath = resolve(basePath, 'app', 'templates');
  expectFilesExist(templatesPath, ['application.hbs', 'index.hbs']);

  expect(
    readFileSync(resolve(templatesPath, 'application.hbs'), { encoding: 'utf-8' })
  ).toMatchSnapshot();
  expect(
    readFileSync(resolve(templatesPath, 'index.hbs'), { encoding: 'utf-8' })
  ).toMatchSnapshot();
}

function verifyTests(basePath: string): void {
  const testsPath = resolve(basePath, 'tests');
  expectFilesExist(testsPath, ['test-helper.ts']);
  expect(
    readFileSync(resolve(testsPath, 'test-helper.ts'), { encoding: 'utf-8' })
  ).toMatchSnapshot();

  const acceptancePath = resolve(basePath, 'tests', 'acceptance');
  expectFilesExist(acceptancePath, ['index-test.ts']);
  expect(
    readFileSync(resolve(acceptancePath, 'index-test.ts'), { encoding: 'utf-8' })
  ).toMatchSnapshot();

  const servicesTestPath = resolve(basePath, 'tests', 'unit', 'services');
  expectFilesExist(servicesTestPath, ['locale-test.ts']);
  expect(
    readFileSync(resolve(servicesTestPath, 'locale-test.ts'), { encoding: 'utf-8' })
  ).toMatchSnapshot();
}
