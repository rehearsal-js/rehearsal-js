import { describe, expect, test } from 'vitest';
import {
  getLibrarySimple,
  getLibraryWithEntrypoint,
  getEmberProjectFixture,
} from '@rehearsal/test-support';
import { SourceType } from '../src/source-type';
import { getMigrationStrategy, SourceFile } from '../src/migration-strategy';

describe('migration-strategy', () => {
  describe('package', () => {
    test('simple', () => {
      const rootDir = getLibrarySimple();
      const strategy = getMigrationStrategy(rootDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['lib/a.js', 'index.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });
    test('simple with entrypoint', () => {
      const rootDir = getLibraryWithEntrypoint();
      const strategy = getMigrationStrategy(rootDir, { entrypoint: 'depends-on-foo.js' });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['foo.js', 'depends-on-foo.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
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
