import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { execa } from 'execa';
import { getFilesByType, getPathToBinary, validateSourcePath } from '../../src/utils/paths.js';
import { cleanOutput } from '../test-helpers/index.js';

describe('path utils', () => {
  let project: Project;
  afterEach(() => {
    project.dispose();
  });

  test('validateSourcePath()', async () => {
    project = new Project('my-project', '0.0.0', {
      files: {
        'index.ts': '',
        src: {
          'index.ts': '',
          'foo.ts': '',
          'blag.js': '',
          'foo.fakeext': '',
          foo: {
            'index.gts': '',
            'bar.gts': '',
            'bleep.gjs': '',
          },
        },
      },
    });
    await project.write();

    expect(validateSourcePath(project.baseDir, resolve(project.baseDir, 'src'), 'ts')).toBeTruthy();

    try {
      validateSourcePath(project.baseDir, resolve(project.baseDir, 'src/dont/exist'), 'ts');
    } catch (error) {
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }

    try {
      validateSourcePath(project.baseDir, resolve(project.baseDir, 'src/foo.fakeext'), 'js');
    } catch (error) {
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }
  });

  test('getFilesByType()', async () => {
    // TS/GTS
    project = new Project('my-project', '0.0.0', {
      files: {
        'index.ts': '',
        src: {
          'index.ts': '',
          'foo.ts': '',
          'blag.js': '',
          foo: {
            'index.gts': '',
            'bar.gts': '',
            'bleep.gjs': '',
          },
        },
      },
    });
    await project.write();

    // TS & GTS
    const [absPathsTS, relPathsTS] = getFilesByType(
      project.baseDir,
      resolve(project.baseDir, 'src'),
      'ts'
    );
    expect(absPathsTS).toHaveLength(4);
    expect(relPathsTS).toHaveLength(4);
    absPathsTS.forEach((path) => expect(path).toContain('/src/'));
    relPathsTS.forEach((path) => expect(path.split('/')[0]).toBe('src'));

    // JS & GJS
    const [absPathsJS, relPathsJS] = getFilesByType(
      project.baseDir,
      resolve(project.baseDir, 'src'),
      'js'
    );
    expect(absPathsJS).toHaveLength(2);
    expect(relPathsJS).toHaveLength(2);
    absPathsJS.forEach((path) => expect(path).toContain('/src/'));
    relPathsJS.forEach((path) => expect(path.split('/')[0]).toBe('src'));
  });

  // TODO: add tests for different scenarios
  // e.g. multiple package managers existed with different version
  test('getPathToBinary()', async () => {
    project = new Project('my-project', '0.0.0', {
      files: {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '0.0.0',
        }),
      },
    });

    project.linkDevDependency('typescript', { baseDir: process.cwd() });

    await project.write();

    const tscPath = await getPathToBinary('tsc', { cwd: project.baseDir });
    const { stdout } = await execa(tscPath, ['--version']);

    expect(stdout).toContain(`Version`);
  });
});
