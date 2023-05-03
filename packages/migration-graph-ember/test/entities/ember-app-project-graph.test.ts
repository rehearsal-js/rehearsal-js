import { afterEach, describe, expect, test } from 'vitest';
import { getEmberProject, getEmberProjectFixture, setupProject } from '@rehearsal/test-support';
import { GraphNode, ModuleNode, UniqueNode } from '@rehearsal/migration-graph-shared';
import { Project } from 'fixturify-project';
import { EmberAppPackage } from '../../src/entities/ember-app-package.js';
import { EmberAppProjectGraph } from '../../src/entities/ember-app-project-graph.js';

function flatten(arr: GraphNode<UniqueNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

function filter(arr: GraphNode<ModuleNode>[]): GraphNode<ModuleNode>[] {
  return Array.from(arr).filter((n) => {
    return !n.content.synthetic;
  });
}

describe('Unit | EmberAppProjectGraph', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('should discover in-repo-addon from package.json', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
    projectGraph.discover();

    expect(projectGraph.graph.hasNode('some-addon')).toBe(true);
  });

  test('should create an edge between app and in-repo addon', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
    projectGraph.discover();

    const rootNode = projectGraph.graph.getNode('app-template');
    const addonNode = projectGraph.graph.getNode('some-addon');
    expect(
      rootNode.adjacent.has(addonNode),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);
  });

  test('options.eager=true should create a synthetic node and then backfill when packageName differs from addonName', async () => {
    // If a parent app is crawled first eagerly, it may create some synthetic nodes.

    // Create an app where the app users a service with ambiguous coordinates

    // package.name is @some-org/some-addon

    // Usage is like:
    // @service('some-addon@some-service') myService

    // The problem here is that the left-part of the coordinates are ember-addon-name and not package.name

    // We put packages in the graph by their packageName

    // This tests the logic in EmberAppProjectGraph.addPackageToGraph()

    // To add a entry in the registry for this lookup, so we can update the synthetic node that is injected when this service is not found.

    project = getEmberProject('app-with-in-repo-addon');

    const addonPackageJson = `
      {
        "name": "@some-org/some-addon",
        "keywords": [
          "ember-addon"
        ],
        "dependencies": {
          "ember-cli-babel": "*",
          "ember-cli-htmlbars": "*",
          "@glimmer/component": "*"
        }
      }
    `;

    project.mergeFiles({
      app: {
        components: {
          'salutation.js': `
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class Salutation extends Component {
  @service('some-addon@some-service') myService;
}`,
        },
      },
      lib: {
        'some-addon': {
          addon: {
            services: {
              'some-service.js': `
              import Service from '@ember/service';

              export default class SomeService extends Service {}
              `,
            },
          },
          app: {
            services: {
              'some-service.js': `export { default } from 'some-addon/services/some-service';`,
            },
          },
          'index.js': `
            'use strict';

            module.exports = {
              name: 'some-addon',

              isDevelopingAddon() {
                return true;
              },
            };
          `,
          'package.json': addonPackageJson,
        },
      },
    });

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir, {
      eager: true,
      basePath: project.baseDir,
    });

    // Manually add the RootPackage or AppPackage for the project, so it will parse the source files.
    const appPackage = new EmberAppPackage(project.baseDir);
    const rootPackageNode = projectGraph.addPackageToGraph(appPackage);

    const rootNode = projectGraph.graph.getNode('app-template');

    expect(projectGraph.graph.nodes.size).toBe(2);

    const sourceNode = rootPackageNode.content.pkg
      ?.getModuleGraph({ basePath: project.baseDir })
      .getNode('app/components/salutation.js');

    expect(sourceNode?.content.parsed, 'the component should have been parsed').toBe(true);

    const addonFoundByAddonName = projectGraph.graph.getNode('some-addon');

    expect(addonFoundByAddonName.content.pkg).equal(undefined);
    expect(addonFoundByAddonName.content.synthetic).toBeTruthy();
    expect(
      rootNode.adjacent.has(addonFoundByAddonName),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);

    projectGraph.discover();

    Array.from(projectGraph.graph.nodes).forEach((node) =>
      expect(node.content.synthetic).toBeFalsy()
    );

    expect(projectGraph.graph.getNode('some-addon').content.synthetic).toBeFalsy();

    const addonFoundByPackageName = projectGraph.graph.getNode('@some-org/some-addon');
    expect(
      rootNode.adjacent.has(addonFoundByPackageName),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);
  });
  describe('options.entrypoint', () => {
    test('should discover only one package and it be from the addon', async () => {
      project = getEmberProject('app-with-in-repo-addon');

      // Augment the app and addon code to have component that uses a service from the addon.
      project.mergeFiles({
        app: {
          components: {
            'obtuse.js': `
            import Component from '@glimmer/component';
            import { inject as service } from '@ember/service';

            export default class Obtuse extends Component {
              @service('some-addon@date') myDate;
            }
          `,
          },
        },
        lib: {
          'some-addon': {
            addon: {
              services: {
                'date.js': `
                    import { inject as service } from '@ember/service';
                    export default class DateService extends Service {}
                  `,
              },
              utils: {
                lib: {
                  'another-util.js': `console.log('Hello World');`,
                },
                'some-util.js': `import anotherUtil from 'some-addon/utils/lib/another-util';`,
              },
            },
            app: {
              services: {
                'date.js': `export { default } from 'some-addon/services/date';`,
              },
            },
          },
        },
      });

      await setupProject(project);

      // This entrypoint is relative to the project rootDir
      const entrypoint = 'lib/some-addon/addon/utils/some-util.js';

      const projectGraph = new EmberAppProjectGraph(project.baseDir, {
        entrypoint,
        basePath: project.baseDir,
      });
      projectGraph.discover();

      const orderedPackages = projectGraph.graph.getSortedNodes();

      expect(orderedPackages.length).toBe(1);

      const [someNode] = orderedPackages;
      const somePackage = someNode.content.pkg;
      expect(somePackage?.packageName, 'there should only be a single package in the graph').toBe(
        'some-addon'
      );

      expect(
        somePackage?.includePatterns.has('addon/utils/some-util.js'),
        'a package whose include pattern is only the entrypoint'
      ).toBeTruthy();

      const allFiles = Array.from(orderedPackages)
        .map((pkg) => {
          const graph = pkg.content.pkg?.getModuleGraph({ basePath: project.baseDir });
          return flatten(graph?.getSortedNodes() || []);
        })
        .flat();

      // Assert the graph has these edges
      expect(allFiles).toStrictEqual([
        'addon/utils/lib/another-util.js',
        'addon/utils/some-util.js',
      ]);
    });
    test('should not include a service dependency', async () => {
      project = getEmberProject('app-with-in-repo-addon');

      // Augment the app and addon code to have component that uses a service from the addon.
      project.mergeFiles({
        app: {
          components: {
            'obtuse.js': `
            import Component from '@glimmer/component';
            import { inject as service } from '@ember/service';

            export default class Obtuse extends Component {
              @service('some-addon@date') myDate;
            }
          `,
          },
        },
        lib: {
          'some-addon': {
            addon: {
              services: {
                'date.js': `
                    import { inject as service } from '@ember/service';
                    export default class DateService extends Service {}
                  `,
              },
            },
            app: {
              services: {
                'date.js': `export { default } from 'some-addon/services/date';`,
              },
            },
          },
        },
      });

      await setupProject(project);

      const projectGraph = new EmberAppProjectGraph(project.baseDir, {
        entrypoint: 'app/components/obtuse.js',
        basePath: project.baseDir,
      });
      projectGraph.discover();

      const orderedPackages = projectGraph.graph.getSortedNodes();

      const allFiles = Array.from(orderedPackages)
        .map((pkg) => {
          const modules = pkg.content.pkg?.getModuleGraph({ basePath: project.baseDir });
          return flatten(modules?.getSortedNodes() || []);
        })
        .flat();

      expect(allFiles).toStrictEqual(['app/components/obtuse.js']);
    });
  });

  test('options.exclude', async () => {
    project = getEmberProject('app');

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir, {
      exclude: ['tests'],
      basePath: project.baseDir,
    });
    projectGraph.discover();

    const orderedPackages = projectGraph.graph.getSortedNodes();

    const allFiles = Array.from(orderedPackages)
      .map((pkg) => {
        const modules = pkg.content.pkg?.getModuleGraph({ basePath: project.baseDir });
        return flatten(modules?.getSortedNodes() || []);
      })
      .flat();

    expect(allFiles).toStrictEqual([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ]);
  });

  test('options.include', async () => {
    project = getEmberProject('app');

    // We exclude public by default see EmberAppPackage
    project.mergeFiles({
      public: {
        'include-this-file.js': '',
      },
    });

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir, {
      include: ['public'],
      basePath: project.baseDir,
    });

    projectGraph.discover();

    const orderedPackages = projectGraph.graph.getSortedNodes();

    const allFiles = Array.from(orderedPackages)
      .map((pkg) => {
        const modules = pkg.content.pkg?.getModuleGraph({ basePath: project.baseDir });
        return flatten(modules?.getSortedNodes() || []);
      })
      .flat();

    expect(allFiles).toStrictEqual([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'public/include-this-file.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  test('should create an edge between an app using a service and the in-repo addon that provides it', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    // Augment the app and addon code to have component that uses a service from the addon.
    project.mergeFiles({
      app: {
        components: {
          'obtuse.js': `
            import Component from '@glimmer/component';
            import { inject as service } from '@ember/service';

            export default class Obtuse extends Component {
              @service('some-addon@date') myDate;
            }
          `,
        },
      },
      lib: {
        'some-addon': {
          addon: {
            services: {
              'date.js': `
                import { inject as service } from '@ember/service';
                export default class DateService extends Service {}
              `,
            },
          },
          app: {
            services: {
              'date.js': `export { default } from 'some-addon/services/date';`,
            },
          },
        },
      },
    });

    await setupProject(project);
    const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
    projectGraph.discover();

    const rootNode = projectGraph.graph.getNode('app-template');
    const addonNode = projectGraph.graph.getNode('some-addon');

    expect(
      rootNode.adjacent.has(addonNode),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);

    const orderedPackages = projectGraph.graph.getSortedNodes(rootNode);

    expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

    const allFiles = Array.from(orderedPackages)
      .map((pkg) => {
        const modules = pkg.content.pkg?.getModuleGraph({ basePath: project.baseDir });
        return flatten(modules?.getSortedNodes() || []);
      })
      .flat();

    expect(allFiles).toStrictEqual([
      'addon/utils/thing.js',
      'addon/components/greet.js',
      'addon/services/date.js',
      'app/app.js',
      'app/components/obtuse.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  describe('variants', () => {
    const EXPECTED_APP_FILES = [
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ];

    test('app', async () => {
      project = await getEmberProjectFixture('app');

      const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
      projectGraph.discover();

      const orderedPackages = projectGraph.graph.getSortedNodes();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template']);
      expect(
        flatten(
          filter(
            orderedPackages[0].content.pkg
              ?.getModuleGraph({ basePath: project.baseDir })
              .getSortedNodes() || []
          )
        )
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('app-with-in-repo-addon', async () => {
      project = await getEmberProjectFixture('app-with-in-repo-addon');

      const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
      projectGraph.discover();

      const rootNode = projectGraph.graph.getNode('app-template');

      const orderedPackages = projectGraph.graph.getSortedNodes(rootNode);

      const addonNode = projectGraph.graph.getNode('some-addon');

      expect(
        rootNode.adjacent.has(addonNode),
        'should have an edge between app and in-repo-addon'
      ).toBe(true);

      expect(addonNode.parent, 'parent should be rootNode').toBe(rootNode);

      // Package order is leaf to root
      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

      expect(
        flatten(
          filter(
            orderedPackages[0].content.pkg
              ?.getModuleGraph({ basePath: project.baseDir })
              .getSortedNodes() || []
          )
        ),
        'expected migration order for addon'
      ).toStrictEqual(['addon/utils/thing.js', 'addon/components/greet.js']);

      expect(
        flatten(
          filter(
            orderedPackages[1].content.pkg
              ?.getModuleGraph({ basePath: project.baseDir })
              .getSortedNodes() || []
          )
        ),
        'expected migration order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);
    });

    test('app-with-in-repo-engine', async () => {
      project = await getEmberProjectFixture('app-with-in-repo-engine');

      const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
      projectGraph.discover();

      const rootNode = projectGraph.graph.getNode('app-template');
      const orderedPackages = projectGraph.graph.getSortedNodes(rootNode);

      expect(flatten(orderedPackages)).toStrictEqual(['some-engine', 'app-template']);
      expect(
        flatten(
          filter(
            orderedPackages[0].content.pkg
              ?.getModuleGraph({ basePath: project.baseDir })
              .getSortedNodes() || []
          )
        ),
        'expected migration order for in-repo-engine'
      ).toStrictEqual(['addon/resolver.js', 'addon/engine.js', 'addon/routes.js']);

      expect(
        flatten(
          filter(
            orderedPackages[1].content.pkg
              ?.getModuleGraph({ basePath: project.baseDir })
              .getSortedNodes() || []
          )
        ),
        'expected migration order for app'
      ).toStrictEqual([
        'app/app.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
        'tests/acceptance/index-test.js',
        'tests/acceptance/some-engine-test.js',
        'tests/test-helper.js',
        'tests/unit/services/locale-test.js',
      ]);
    });
  });

  describe('ember monorepo', () => {
    let project: Project;

    afterEach(() => {
      project.dispose();
    });

    test('returns the graph in top sort order', async () => {
      project = getEmberProject('monorepo');
      await project.write();
      const projectGraph = new EmberAppProjectGraph(project.baseDir, { basePath: project.baseDir });
      projectGraph.discover();
      const nodes = projectGraph.graph.getSortedNodes();

      expect(nodes.map((n) => n.content.pkg?.packageName)).toEqual([
        '@company/b',
        '@company/a',
        '@company/c',
        '@company/d',
        'monorepo',
      ]);
    });
  });
});
