import { describe, expect, test, afterEach } from 'vitest';
import { getEmberProjectFixture, getFiles } from '@rehearsal/test-support';
import { Project } from 'fixturify-project';
import { SourceType } from '../src/source-type.js';
import { getMigrationStrategy, SourceFile } from '../src/migration-strategy.js';

describe('migration-strategy', () => {
  let project: Project;

  afterEach(() => {
    if (project) {
      project.dispose();
    }
  });

  describe('library', () => {
    test('simple', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('simple'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['lib/a.js', 'index.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });

    test('library w/ tests', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-tests'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      expect(relativePaths).toStrictEqual(['lib/a.js', 'index.js', 'test/sample.test.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });

    test('options.entrypoint', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-entrypoint'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        entrypoint: 'depends-on-foo.js',
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const relativePaths: Array<string> = files.map((f) => f.relativePath);
      // Should not include index.js as it is not in the entrypoint's import graph.
      expect(relativePaths).toStrictEqual(['foo.js', 'depends-on-foo.js']);
      expect(strategy.sourceType).toBe(SourceType.Library);
    });

    test('options.include', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-ignored-files'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        include: ['webpack.config.js'],
        crawlDeps: true,
        crawlDevDeps: true,
        exclude: [],
        ignoredPackages: [],
      });
      const orderedFiles: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = orderedFiles.map((f) => f.relativePath);

      expect(actual).toStrictEqual([
        'lib/a.js',
        'index.js',
        'test/sample.test.js',
        'webpack.config.js',
      ]);
    });

    test('options.exclude', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('simple'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        exclude: ['index.js'],
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        ignoredPackages: [],
      });
      const orderedFiles: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = orderedFiles.map((f) => f.relativePath);

      expect(actual).toStrictEqual(['lib/a.js']);
    });

    test('options.entrypoint', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('simple'),
      });

      await project.write();

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        entrypoint: 'index.js',
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const orderedFiles: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = orderedFiles.map((f) => f.relativePath);

      expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
    });

    describe('workspaces', () => {
      test('should create migration strategy for a project with workspaces', async () => {
        const project = new Project('my-package', '0.0.0', {
          files: getFiles('library-with-workspaces'),
        });

        await project.write();

        const strategy = getMigrationStrategy(project.baseDir, {
          basePath: project.baseDir,
          crawlDeps: true,
          crawlDevDeps: true,
          include: [],
          exclude: [],
          ignoredPackages: [],
        });
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const relativePaths: Array<string> = files.map((f) => f.relativePath);
        expect(relativePaths).toStrictEqual([
          'packages/blorp/build.js',
          'packages/blorp/lib/impl.js',
          'packages/blorp/index.js',
          'packages/foo/lib/a.js',
          'packages/foo/index.js',
          'index.js',
          'some-util.js',
        ]);
        expect(strategy.sourceType).toBe(SourceType.Library);
      });

      test('should create migration strategy for a project with workspaces childPackage', async () => {
        const project = new Project('my-package', '0.0.0', {
          files: getFiles('library-with-workspaces'),
        });

        await project.write();

        const strategy = getMigrationStrategy(project.baseDir + '/packages/foo', {
          basePath: project.baseDir,
          crawlDeps: true,
          crawlDevDeps: true,
          include: [],
          exclude: [],
          ignoredPackages: [],
        });
        const files: Array<SourceFile> = strategy.getMigrationOrder();
        const relativePaths: Array<string> = files.map((f) => f.relativePath);
        expect(relativePaths).toStrictEqual([
          'packages/blorp/build.js',
          'packages/blorp/lib/impl.js',
          'packages/blorp/index.js',
          'packages/foo/lib/a.js',
          'packages/foo/index.js',
        ]);
        expect(strategy.sourceType).toBe(SourceType.Library);
      });

      test('options.entrypoint should only show the graph for a single file', async () => {
        const project = new Project('my-package', '0.0.0', {
          files: getFiles('library-with-workspaces'),
        });

        await project.write();

        const options = {
          entrypoint: 'packages/blorp/index.js',
          basePath: project.baseDir,
          crawlDeps: true,
          crawlDevDeps: true,
          include: [],
          exclude: [],
          ignoredPackages: [],
        };
        const strategy = getMigrationStrategy(project.baseDir, options);
        const orderedFiles: Array<SourceFile> = strategy.getMigrationOrder();
        const relativePaths: Array<string> = orderedFiles.map((f) => f.relativePath);
        expect(relativePaths).toStrictEqual([
          'packages/blorp/lib/impl.js',
          'packages/blorp/index.js',
        ]);
        expect(strategy.sourceType).toBe(SourceType.Library);
      });

      test('options.exclude should filter out a file in a workspace package', async () => {
        const project = new Project('my-package', '0.0.0', {
          files: getFiles('library-with-workspaces'),
        });

        await project.write();

        project.mergeFiles({
          packages: {
            blorp: {
              'should-have': { 'index.js': 'console.log(1);' },
              'should-ignore': { 'index.js': 'console.log(1);' },
            },
          },
        });

        const options = {
          exclude: ['packages/blorp/should-ignore'],
          basePath: project.baseDir,
          crawlDeps: true,
          crawlDevDeps: true,
          include: [],
          ignoredPackages: [],
        };
        const strategy = getMigrationStrategy(project.baseDir, options);
        const orderedFiles: Array<SourceFile> = strategy.getMigrationOrder();
        const relativePaths: Array<string> = orderedFiles.map((f) => f.relativePath);
        expect(relativePaths).toStrictEqual([
          'packages/blorp/build.js',
          'packages/blorp/lib/impl.js',
          'packages/blorp/index.js',
          'packages/foo/lib/a.js',
          'packages/foo/index.js',
          'index.js',
          'some-util.js',
        ]);
        expect(strategy.sourceType).toBe(SourceType.Library);
      });
    });
  });

  describe('ember', () => {
    const EXPECTED_APP_FILES = [
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ];

    test('options.entrypoint', async () => {
      project = await getEmberProjectFixture('app-with-utils');

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        entrypoint: 'tests/unit/utils/math-test.js',
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'app/utils/math.js',
        'tests/unit/utils/math-test.js', // entrypoint should be last in file order.
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('app should match migration order', async () => {
      const project = await getEmberProjectFixture('app');

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        ...EXPECTED_APP_FILES,
        'tests/acceptance/index-test.js',
        'tests/test-helper.js',
        'tests/unit/services/locale-test.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('app-with-in-repo-addon should match migration order', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'lib/some-addon/addon/utils/thing.js',
        'lib/some-addon/addon/components/greet.js',
        ...EXPECTED_APP_FILES,
        'tests/acceptance/index-test.js',
        'tests/test-helper.js',
        'tests/unit/services/locale-test.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('app-with-in-repo-engine should match migration order', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-engine');

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'lib/some-engine/addon/resolver.js',
        'lib/some-engine/addon/engine.js',
        'lib/some-engine/addon/routes.js',
        ...EXPECTED_APP_FILES,
        'tests/acceptance/index-test.js',
        'tests/acceptance/some-engine-test.js',
        'tests/test-helper.js',
        'tests/unit/services/locale-test.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberApp);
    });

    test('addon should match migration order', async () => {
      const project = await getEmberProjectFixture('addon');

      const strategy = getMigrationStrategy(project.baseDir, {
        basePath: project.baseDir,
        crawlDeps: true,
        crawlDevDeps: true,
        include: [],
        exclude: [],
        ignoredPackages: [],
      });
      const files: Array<SourceFile> = strategy.getMigrationOrder();
      const actual: Array<string> = files.map((f) => f.relativePath);
      expect(actual).toStrictEqual([
        'addon/components/greet.js',
        'tests/acceptance/addon-template-test.js',
        'tests/dummy/app/app.js',
        'tests/dummy/app/router.js',
        'tests/test-helper.js',
      ]);
      expect(strategy.sourceType).toBe(SourceType.EmberAddon);
    });
  });
});
