import { afterEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import {
  determineProjectName,
  isDepsPreReq,
  isESLintPreReq,
  isTSConfigPreReq,
} from '../../src/utils/prereq-checks.js';

const __dirname = new URL('.', import.meta.url).pathname;

describe('prereq checks', () => {
  let project: Project;
  afterEach(() => {
    project.dispose();
  });

  test('isTSConfigPreReq()', async () => {
    project = new Project('my-project', '0.0.0', {
      files: {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            strict: true,
            skipLibCheck: true,
            noEmit: true,
          },
          paths: {
            '*': ['types/*'],
          },
        }),
      },
    });

    await project.write();

    expect(
      isTSConfigPreReq(project.baseDir, {
        compilerOptions: {
          strict: true,
          skipLibCheck: true,
        },
      })
    ).toBeTruthy();

    expect(() =>
      isTSConfigPreReq(project.baseDir, {
        compilerOptions: {
          strict: false,
          skipLibCheck: false,
        },
        glint: {
          environment: 'foo',
        },
      })
    ).toThrowErrorMatchingSnapshot();
  });

  test('isESLintPreReq()', async () => {
    // JSON
    project = new Project('my-project', '0.0.0', {
      files: {
        '.eslintrc.json': JSON.stringify({
          parser: '@typescript-eslint/parser',
        }),
      },
    });
    await project.write();
    expect(isESLintPreReq(project.baseDir, '@typescript-eslint/parser')).toBeTruthy();
    expect(() => isESLintPreReq(project.baseDir, '@foo/parser')).toThrowErrorMatchingSnapshot();
    project.dispose();

    // YML
    project = new Project('my-project', '0.0.0', {
      files: {
        '.eslintrc.yml': `parser: '@typescript-eslint/parser'`,
      },
    });
    await project.write();
    expect(isESLintPreReq(project.baseDir, '@typescript-eslint/parser')).toBeTruthy();
    project.dispose();

    // JS
    project = new Project('my-project', '0.0.0', {
      files: {
        '.eslintrc.js': `module.exports = { parser: '@typescript-eslint/parser' }`,
      },
    });
    await project.write();
    expect(isESLintPreReq(project.baseDir, '@typescript-eslint/parser')).toBeTruthy();
    project.dispose();
  });

  test('isDepsPreReq()', async () => {
    const reqDeps = {
      typescript: '5.0.0',
      '@typescript-eslint/parser': '5.0.0',
    };

    const reqDepsFailure = {
      ...reqDeps,
      foo: '1.0.0',
      bar: '5.1.5',
    };

    project = new Project('my-project', '0.0.0');

    project.addDependency('typescript', 'latest');
    project.addDevDependency('eslint', 'latest');
    project.addDevDependency('eslint-plugin-glint', '^1.0.0');
    project.addDevDependency('@glint/core', '^1.0.0');
    project.addDevDependency('@typescript-eslint/parser', '^5.59.2');

    await project.write();

    expect(isDepsPreReq(project.baseDir, reqDeps)).toBeTruthy();
    expect(() => isDepsPreReq(project.baseDir, reqDepsFailure)).toThrowErrorMatchingSnapshot();
  });

  test('determineProjectName()', () => {
    const projectName = determineProjectName(__dirname);
    expect(projectName).toEqual('@rehearsal/cli');
  });
});
