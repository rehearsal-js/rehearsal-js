import { resolve } from 'node:path';
import { readFileSync, readdirSync, promises as fs, existsSync } from 'node:fs';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { getEmberAddonProject, getEmberAddonGjsProject } from '@rehearsal/test-support';
import { readJSONSync } from 'fs-extra/esm';
import { TSConfig } from '../../../src/types.js';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';
import { runBin } from '../../test-helpers/index.js';
import type { Project } from 'fixturify-project';
import type { PackageJson } from 'type-fest';

describe('migrate - ember addon: e2e', () => {
  describe('ember addon', () => {
    let project: Project;

    beforeAll(async () => {
      project = getEmberAddonProject();
      await project.write();

      await runBin('migrate', ['--ci'], {
        cwd: project.baseDir,
      });
    });

    afterAll(() => {
      project.dispose();
    });

    test('should have the correct files in the base directory', async () => {
      expectFilesExist(project.baseDir, [
        'ember-cli-build.js',
        'testem.js',
        '.ember-cli',
        'index.js',
      ]);
      await verifyPackageJson(project.baseDir);
      verifyReport(project.baseDir);
      verifyTsConfig(project.baseDir);
    });

    test('should have the correct files in the app components directory', () => {
      const appComponentsPath = resolve(project.baseDir, 'app', 'components');
      expectFilesExist(appComponentsPath, ['greet.js']);
    });

    test('should have the correct files in the addon components directory', () => {
      const addonComponentsPath = resolve(project.baseDir, 'addon', 'components');
      expectFilesExist(addonComponentsPath, ['greet.ts', 'greet.hbs']);

      expect(
        readFileSync(resolve(addonComponentsPath, 'greet.ts'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(addonComponentsPath, 'greet.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
    });

    test('should have the correct files in the config directory', () => {
      const configPath = resolve(project.baseDir, 'config');
      expectFilesExist(configPath, ['ember-try.js', 'environment.js']);
    });

    test('should have the correct files in the tests directory', () => {
      const testsPath = resolve(project.baseDir, 'tests');
      expectFilesExist(testsPath, ['test-helper.ts', 'index.html']);

      let testHelperContent = readFileSync(resolve(testsPath, 'test-helper.ts'), {
        encoding: 'utf-8',
      });
      testHelperContent = testHelperContent.replace(
        new RegExp(`${project.baseDir}`, 'g'),
        '<tmp-path>'
      );
      expect(testHelperContent).toMatchSnapshot();
    });

    test('should have the correct files in the tests acceptance directory', () => {
      const testsAcceptancePath = resolve(project.baseDir, 'tests', 'acceptance');
      expectFilesExist(testsAcceptancePath, ['addon-template-test.ts']);

      let addonTemplateTestContent = readFileSync(
        resolve(testsAcceptancePath, 'addon-template-test.ts'),
        {
          encoding: 'utf-8',
        }
      );
      addonTemplateTestContent = addonTemplateTestContent.replace(
        new RegExp(`${project.baseDir}`, 'g'),
        '<tmp-path>'
      );
      expect(addonTemplateTestContent).toMatchSnapshot();
    });

    test('should have the correct files in the tests dummy app directory', () => {
      const testsDummyAppPath = resolve(project.baseDir, 'tests', 'dummy', 'app');
      expectFilesExist(testsDummyAppPath, ['app.ts', 'router.ts', 'index.html']);

      let testsDummyAppContent = readFileSync(resolve(testsDummyAppPath, 'app.ts'), {
        encoding: 'utf-8',
      });
      testsDummyAppContent = testsDummyAppContent.replace(
        new RegExp(`${project.baseDir}`, 'g'),
        '<tmp-path>'
      );
      expect(testsDummyAppContent).toMatchSnapshot();

      let testsDummyRouterContent = readFileSync(resolve(testsDummyAppPath, 'router.ts'), {
        encoding: 'utf-8',
      });
      testsDummyRouterContent = testsDummyRouterContent.replace(
        new RegExp(`${project.baseDir}`, 'g'),
        '<tmp-path>'
      );
      expect(testsDummyRouterContent).toMatchSnapshot();
    });

    test('should have the correct files in the tests dummy app templates directory', () => {
      const testsDummyTemplatesPath = resolve(
        project.baseDir,
        'tests',
        'dummy',
        'app',
        'templates'
      );
      expectFilesExist(testsDummyTemplatesPath, ['application.hbs', 'index.hbs']);

      expect(
        readFileSync(resolve(testsDummyTemplatesPath, 'application.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(testsDummyTemplatesPath, 'index.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
    });
  });

  describe('ember addon gjs', () => {
    let project: Project;

    beforeAll(async () => {
      project = getEmberAddonGjsProject();
      await project.write();

      await runBin('migrate', ['--ci'], {
        cwd: project.baseDir,
      });
    });

    afterAll(() => {
      project.dispose();
    });

    test('should have the correct files in the base directory', async () => {
      expectFilesExist(project.baseDir, [
        'ember-cli-build.js',
        'testem.js',
        '.ember-cli',
        'index.js',
      ]);
      await verifyPackageJson(project.baseDir);
      verifyReport(project.baseDir);
      verifyTsConfig(project.baseDir);
    });

    test('should have the correct files in the config directory', () => {
      const configPath = resolve(project.baseDir, 'config');
      expectFilesExist(configPath, ['ember-try.js', 'environment.js']);
    });

    test('should have the correct files in the tests directory', () => {
      const testsPath = resolve(project.baseDir, 'tests');
      expectFilesExist(testsPath, ['test-helper.ts', 'index.html']);

      let testHelperContent = readFileSync(resolve(testsPath, 'test-helper.ts'), {
        encoding: 'utf-8',
      });
      testHelperContent = testHelperContent.replace(
        new RegExp(`${project.baseDir}`, 'g'),
        '<tmp-path>'
      );
      expect(testHelperContent).toMatchSnapshot();
    });

    test('should have the correct files in the tests dummy app directory', () => {
      const testsDummyAppPath = resolve(project.baseDir, 'tests', 'dummy', 'app');
      expectFilesExist(testsDummyAppPath, ['app.ts', 'router.ts', 'index.html']);

      let appContent = readFileSync(resolve(testsDummyAppPath, 'app.ts'), { encoding: 'utf-8' });
      appContent = appContent.replace(new RegExp(`${project.baseDir}`, 'g'), '<tmp-path>');
      let routerContent = readFileSync(resolve(testsDummyAppPath, 'router.ts'), {
        encoding: 'utf-8',
      });
      routerContent = routerContent.replace(new RegExp(`${project.baseDir}`, 'g'), '<tmp-path>');
      expect(appContent).toMatchSnapshot();
      expect(routerContent).toMatchSnapshot();
    });

    test('should have the correct files in the tests dummy app templates directory', () => {
      const testsDummyTemplatesPath = resolve(
        project.baseDir,
        'tests',
        'dummy',
        'app',
        'templates'
      );
      expectFilesExist(testsDummyTemplatesPath, ['application.hbs']);

      expect(
        readFileSync(resolve(testsDummyTemplatesPath, 'application.hbs'), { encoding: 'utf-8' })
      ).toMatchSnapshot();
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
  expect(existsSync(reportPath)).toBeTruthy();
  expect(existsSync(sarifPath)).toBeTruthy();
  expect(existsSync(jsonPath)).toBeTruthy();
}

function verifyTsConfig(basePath: string): void {
  const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json')) as TSConfig;
  expect(tsConfig).matchSnapshot();
}
