import { beforeAll, describe, expect, test } from 'vitest';

import { DetectedSource } from '../src/migration-graph';
import { getMigrationStrategy, SourceFile } from '../src/migration-strategy';
import { getLibrarySimple, getLibraryWithEntrypoint } from './fixtures/library';
import { getEmberProjectFixture, testSetup } from './fixtures/project';

const TEST_TIMEOUT = 500000;

describe('migration-strategy', () => {
  describe('package', () => {
    test('simple', () => {
      const rootDir = getLibrarySimple();
      const strategy = getMigrationStrategy(rootDir);
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['lib/a.js', 'index.js']);
      expect(strategy.sourceType).toBe(DetectedSource.Library);
    });
    test('simple with entrypoint', () => {
      const rootDir = getLibraryWithEntrypoint();
      const strategy = getMigrationStrategy(rootDir, { entrypoint: 'depends-on-foo.js' });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['foo.js', 'depends-on-foo.js']);
      expect(strategy.sourceType).toBe(DetectedSource.Library);
    });
  });

  describe('ember', () => {
    beforeAll(() => testSetup());

    test(
      'app should match migration order',
      async () => {
        const project = await getEmberProjectFixture('app');

        const strategy = getMigrationStrategy(project.baseDir);
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const actaul: Array<string> = files.map((f) => f.relativePath);
        expect(actaul).toStrictEqual([
          'app/app.js',
          'app/components/salutation.js',
          'app/router.js',
        ]);
        expect(strategy.sourceType).toBe(DetectedSource.EmberApp);
      },
      TEST_TIMEOUT
    );

    test(
      'app-with-in-repo-addon should match migration order',
      async () => {
        const project = await getEmberProjectFixture('app-with-in-repo-addon');

        const strategy = getMigrationStrategy(project.baseDir);
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const actaul: Array<string> = files.map((f) => f.relativePath);
        expect(actaul).toStrictEqual([
          'lib/some-addon/addon/components/greet.js',
          'lib/some-addon/app/components/greet.js',
          'lib/some-addon/index.js',
          'app/app.js',
          'app/components/salutation.js',
          'app/router.js',
        ]);
        expect(strategy.sourceType).toBe(DetectedSource.EmberApp);
      },
      TEST_TIMEOUT
    );

    test(
      'app-with-in-repo-engine should match migration order',
      async () => {
        const project = await getEmberProjectFixture('app-with-in-repo-engine');

        const strategy = getMigrationStrategy(project.baseDir);
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const actaul: Array<string> = files.map((f) => f.relativePath);
        expect(actaul).toStrictEqual([
          'lib/some-engine/addon/resolver.js',
          'lib/some-engine/addon/engine.js',
          'lib/some-engine/addon/routes.js',
          'lib/some-engine/index.js',
          'app/app.js',
          'app/components/salutation.js',
          'app/router.js',
        ]);
        expect(strategy.sourceType).toBe(DetectedSource.EmberApp);
      },
      TEST_TIMEOUT
    );

    test(
      'addon should match migration order',
      async () => {
        const project = await getEmberProjectFixture('addon');

        const strategy = getMigrationStrategy(project.baseDir);
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const actaul: Array<string> = files.map((f) => f.relativePath);
        expect(actaul).toStrictEqual([
          'addon/components/greet.js',
          'app/components/greet.js',
          'index.js',
        ]);
        expect(strategy.sourceType).toBe(DetectedSource.EmberAddon);
      },
      TEST_TIMEOUT
    );
  });
});
