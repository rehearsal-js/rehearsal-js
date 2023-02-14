import { describe, expect, test } from 'vitest';
import { getEmberProject, getEmberProjectFixture, setupProject } from '@rehearsal/test-support';
import { EmberAppPackage } from '../../src/entities/ember-app-package';
import { EmberAppProjectGraph } from '../../src/entities/ember-app-project-graph';
import type { GraphNode, ModuleNode, UniqueNode } from '@rehearsal/migration-graph-shared';

function flatten(arr: GraphNode<UniqueNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

function filter(arr: GraphNode<ModuleNode>[]): GraphNode<ModuleNode>[] {
  return Array.from(arr).filter((n) => {
    return !n.content.synthetic;
  });
}

describe('Unit | EmberAppProjectGraph', () => {
  test('should discover in-repo-addon from package.json', async () => {
    const project = getEmberProject('app-with-in-repo-addon');

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir);

    const appPackage = new EmberAppPackage(project.baseDir);
    projectGraph.addPackageToGraph(appPackage);

    expect(projectGraph.graph.hasNode('some-addon')).toBe(true);
  });

  test('should create an edge between app and in-repo addon', async () => {
    const project = getEmberProject('app-with-in-repo-addon');

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir);

    const appPackage = new EmberAppPackage(project.baseDir);
    projectGraph.addPackageToGraph(appPackage);

    const rootNode = projectGraph.graph.getNode('app-template');
    const addonNode = projectGraph.graph.getNode('some-addon');
    expect(
      rootNode.adjacent.has(addonNode),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);
  });

  test('options.eager=true should create a synethic node and then backfill when packageName differs from addonName', async () => {
    // If a parent app is crawled first eagerly, it may create some synthetic nodes.

    // Create an app where the app users a service with ambigous coordinates

    // package.name is @some-org/some-addon

    // Usage is like:
    // @service('some-addon@some-service') myService

    // The problem here is that the left-part of the coordinates are ember-addon-name and not package.name

    // We put packages in the graph by their packageName

    // This tests the logic in EmberAppprojectGraph.addPackageToGrpah()

    // To add a entry in the registry for this lookup so we can update the synthetic node that is injected when this service is not found.

    const project = getEmberProject('app-with-in-repo-addon');

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

    const projectGraph = new EmberAppProjectGraph(project.baseDir, { eager: true });
    const appPackage = new EmberAppPackage(project.baseDir);
    const rootPackageNode = projectGraph.addPackageToGraph(appPackage);

    const rootNode = projectGraph.graph.getNode('app-template');

    expect(projectGraph.graph.nodes.size).toBe(2);

    const sourceNode = rootPackageNode.content.pkg
      ?.getModuleGraph()
      .getNode('app/components/salutation.js');

    expect(sourceNode?.content.parsed, 'the component should have been parsed').toBe(true);

    // We should have a synthetic node for some-addon
    const addonFoundByAddonName = projectGraph.graph.getNode('some-addon');
    expect(addonFoundByAddonName.content.synthetic).toBeFalsy();
    expect(
      rootNode.adjacent.has(addonFoundByAddonName),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);

    const addonFoundByPackageName = projectGraph.graph.getNode('@some-org/some-addon');
    expect(
      rootNode.adjacent.has(addonFoundByPackageName),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);
  });

  test('options.entrypoint', async () => {
    const project = getEmberProject('app-with-in-repo-addon');

    // TODO projectGraph should have meta data about how some-addon@date is being used.

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
    });
    projectGraph.discover();

    const orderedPackages = projectGraph.graph.topSort();

    const allFiles = Array.from(orderedPackages)
      .map((pkg) => {
        const modules = pkg.content.pkg.getModuleGraph();
        return flatten(modules.topSort());
      })
      .flat();

    expect(allFiles).toStrictEqual(['app/components/obtuse.js']);
  });
  test('should create an edge between an app using a service and the in-repo addon that provides it', async () => {
    const project = getEmberProject('app-with-in-repo-addon');

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
    const projectGraph = new EmberAppProjectGraph(project.baseDir);
    projectGraph.discover();

    const rootNode = projectGraph.graph.getNode('app-template');
    const addonNode = projectGraph.graph.getNode('some-addon');

    expect(
      rootNode.adjacent.has(addonNode),
      'should have an edge between app and in-repo-addon'
    ).toBe(true);

    const orderedPackages = projectGraph.graph.topSort(rootNode);

    expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

    const allFiles = Array.from(orderedPackages)
      .map((pkg) => {
        const modules = pkg.content.pkg.getModuleGraph();
        return flatten(modules.topSort());
      })
      .flat();

    expect(allFiles).toStrictEqual([
      'addon/components/greet.js',
      'addon/services/date.js',
      'app/app.js',
      'app/components/obtuse.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ]);
  });
  describe('variants', () => {
    const EXPECTED_APP_FILES = [
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ];

    test('app', async () => {
      const project = await getEmberProjectFixture('app');

      const projectGraph = new EmberAppProjectGraph(project.baseDir);
      projectGraph.discover();

      const orderedPackages = projectGraph.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template']);
      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('app-with-in-repo-addon', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const projectGraph = new EmberAppProjectGraph(project.baseDir);
      projectGraph.discover();

      const rootNode = projectGraph.graph.getNode('app-template');

      const orderedPackages = projectGraph.graph.topSort(rootNode);

      const addonNode = projectGraph.graph.getNode('some-addon');

      expect(
        rootNode.adjacent.has(addonNode),
        'should have an edge between app and in-repo-addon'
      ).toBe(true);

      expect(addonNode.parent, 'parent should bse rootNode').toBe(rootNode);

      // Package order is leaf to root
      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for addon'
      ).toStrictEqual(['addon/components/greet.js']);

      expect(
        flatten(filter(orderedPackages[1].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('app-with-in-repo-engine', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-engine');

      const projectGraph = new EmberAppProjectGraph(project.baseDir);
      projectGraph.discover();

      const rootNode = projectGraph.graph.getNode('app-template');
      const orderedPackages = projectGraph.graph.topSort(rootNode);

      expect(flatten(orderedPackages)).toStrictEqual(['some-engine', 'app-template']);
      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for in-repo-engine'
      ).toStrictEqual(['addon/resolver.js', 'addon/engine.js', 'addon/routes.js']);

      expect(
        flatten(filter(orderedPackages[1].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
  });
});
