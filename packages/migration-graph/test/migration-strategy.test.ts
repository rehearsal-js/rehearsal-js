import { describe, expect, test } from 'vitest';
import { getLibrary, getEmberProjectFixture } from '@rehearsal/test-support';
import { SourceType } from '../src/source-type';
import { getMigrationStrategy, SourceFile } from '../src/migration-strategy';

describe('migration-strategy', () => {
  describe('library', () => {
    test('simple', () => {
      const rootDir = getLibrary('simple');
      const strategy = getMigrationStrategy(rootDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['lib/a.js', 'index.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });
    test('simple with entrypoint', () => {
      const rootDir = getLibrary('library-with-entrypoint');
      const strategy = getMigrationStrategy(rootDir, { entrypoint: 'depends-on-foo.js' });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      // Should not include index.js as it is not in the entrypoint's import graph.
      expect(relativePaths).toStrictEqual(['foo.js', 'depends-on-foo.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });

    test('workspaces', () => {
      const rootDir = getLibrary('library-with-workspaces');
      const strategy = getMigrationStrategy(rootDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual([
        'packages/blorp/build.js',
        'packages/blorp/lib/impl.js',
        'packages/blorp/index.js',
        'packages/foo/lib/a.js',
        'packages/foo/index.js',
        'some-util.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });

    test('logger', () => {
      const rootDir = getLibrary('workspace-with-package-scope-issue');
      const strategy = getMigrationStrategy(rootDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual([
        'packages/leaf/build.js', // This file should emit a warning
        'packages/leaf/lib/impl.js',
        'packages/leaf/index.js',
        'packages/branch/build.js', // This file should emit a warning
        'packages/branch/lib/a.js',
        'packages/branch/index.js',
        'some-shared-util.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.Library);
      const actual = strategy.report;

      const someDir = strategy.rootDir;

      const expected = [
        `[warn] The source file "build.js" is importing a file "../../some-shared-util.js" that is external to "@some-workspace/leaf" package directory (${someDir}/packages/leaf), omitting target file ("../../some-shared-util.js") form package-graph.`,
        `[warn] The target file "../../some-shared-util.js" is external to package "@some-workspace/leaf" (${someDir}/packages/leaf), omitting target file form package-graph.`,
        `[warn] The source file "build.js" is importing a file "../../some-shared-util.js" that is external to "@some-workspace/branch" package directory (${someDir}/packages/branch), omitting target file ("../../some-shared-util.js") form package-graph.`,
        `[warn] The target file "../../some-shared-util.js" is external to package "@some-workspace/branch" (${someDir}/packages/branch), omitting target file form package-graph.`,
      ];

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('ember', () => {
    const EXPECTED_APP_FILES = [
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ];
    test('app should match migration order', async () => {
      const project = await getEmberProjectFixture('app');

      const strategy = getMigrationStrategy(project.baseDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual(EXPECTED_APP_FILES);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('app-with-in-repo-addon should match migration order', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const strategy = getMigrationStrategy(project.baseDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'lib/some-addon/addon/components/greet.js',
        'lib/some-addon/app/components/greet.js',
        'lib/some-addon/index.js',
        ...EXPECTED_APP_FILES,
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('app-with-in-repo-engine should match migration order', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-engine');

      const strategy = getMigrationStrategy(project.baseDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'lib/some-engine/addon/resolver.js',
        'lib/some-engine/addon/engine.js',
        'lib/some-engine/addon/routes.js',
        'lib/some-engine/index.js',
        ...EXPECTED_APP_FILES,
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('addon should match migration order', async () => {
      const project = await getEmberProjectFixture('addon');

      const strategy = getMigrationStrategy(project.baseDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'addon/components/greet.js',
        'app/components/greet.js',
        'index.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberAddon);
    });
  });
});
