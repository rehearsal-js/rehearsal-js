import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getEmberProject,
  getEmberProjectFixture,
  getEmptyInRepoAddonFiles,
  setupProject,
} from '@rehearsal/test-support';
import merge from 'lodash.merge';
import {
  type ModuleNode,
  type PackageNode,
  type Graph,
  type GraphNode,
} from '@rehearsal/migration-graph-shared';
import { EmberAppPackage } from '../../src/entities/ember-app-package.js';
import { EmberAddonPackage } from '../../src/entities/ember-addon-package.js';
import {
  EmberAppPackageGraph,
  EmberAppPackageGraphOptions,
} from '../../src/entities/ember-app-package-graph.js';
import { EmberAppProjectGraph } from '../../src/entities/ember-app-project-graph.js';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('Unit | EmberAppPackageGraph', () => {
  test('should produce a graph from an ember app', async () => {
    const project = await getEmberProjectFixture('app');

    const p = new EmberAppPackage(project.baseDir);
    const output: Graph<ModuleNode> = new EmberAppPackageGraph(p).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  test('should create an edge between a test file and app file with appName path', async () => {
    const project = await getEmberProjectFixture('app-with-utils');

    const p = new EmberAppPackage(project.baseDir);
    const packageGraph = new EmberAppPackageGraph(p);
    packageGraph.discover();

    const testFileNode = packageGraph.graph.getNode('tests/unit/utils/math-test.js');
    const implNode = packageGraph.graph.getNode('app/utils/math.js');

    expect(
      testFileNode.adjacent.has(implNode),
      'should have an edge between the test and implementation'
    ).toBeTruthy();
  });

  test('should handle nested services', async () => {
    const project = getEmberProject('app');

    project.mergeFiles({
      app: {
        services: {
          'date.js': `
              import { inject as service } from '@ember/service';
              export default class DateService extends Service {}
            `,
          'request.js': `
              import Service from '@ember/service';
              import { inject as service } from '@ember/service';
              export default class Request extends Service {
                @service date;
              }
            `,
          'locale.js': `
              import Service from '@ember/service';
              import { inject as service } from '@ember/service';
              export default class Locale extends Service {
                @service request;
                current() {
                  return 'en-US';
                }
              }
            `,
        },
      },
    });

    await setupProject(project);

    const p = new EmberAppPackage(project.baseDir);
    const options = {};
    const output: Graph<ModuleNode> = new EmberAppPackageGraph(p, options).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual([
      'app/app.js',
      'app/services/date.js',
      'app/services/request.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  test('should use options.resolutions.services to ignore non-obvious externals', async () => {
    const project = getEmberProject('app');

    project.mergeFiles({
      app: {
        components: {
          'fancy.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';

              export default class Salutation extends Component {
                @service fastboot;
              }
            `,
        },
      },
    });
    const packageName = 'lib/some-addon/addon/services/orphan';

    project.addDependency(packageName, '1.0.0');

    await setupProject(project);

    const p = new EmberAppPackage(project.baseDir);
    const options = {
      resolutions: {
        services: {
          fastboot: packageName,
        },
      },
    };

    const output: Graph<ModuleNode> = new EmberAppPackageGraph(p, options).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual([
      'app/app.js',
      'app/components/fancy.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  test('should find a synthetic package node when an external service is discovered', async () => {
    const project = getEmberProject('app');

    project.mergeFiles({
      app: {
        components: {
          'obtuse.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';

              export default class Obtuse extends Component {
                @service('some-external@date') myDate;
              }
            `,
        },
      },
    });

    await setupProject(project);

    const m = new EmberAppProjectGraph(project.baseDir);
    const emberPackage = new EmberAppPackage(project.baseDir);
    const source = m.addPackageToGraph(emberPackage);
    const options: EmberAppPackageGraphOptions = { parent: source, project: m };
    emberPackage.getModuleGraph(options);

    const dest = m.graph.getNode('some-external');
    expect(dest).toBeTruthy();
    expect(dest?.content.synthetic, 'the addon node to be synthetic').toBe(true);

    expect(
      dest ? source.adjacent.has(dest) : false,
      'there to be an edge between the app (source) and the addon (dest)'
    ).toBe(true);
  });

  test('should update sythetic node with actual packageNode once added', async () => {
    const project = getEmberProject('app-with-in-repo-addon');

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
            service: {
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

    const emberPackage = new EmberAppPackage(project.baseDir);
    const appNode = projectGraph.addPackageToGraph(emberPackage, false);

    const options: EmberAppPackageGraphOptions = { parent: appNode, project: projectGraph };
    emberPackage.getModuleGraph(options);

    const node: GraphNode<PackageNode> = projectGraph.graph.getNode('some-addon');
    expect(node?.content.synthetic).toBe(true);

    const emberAddonPackage = new EmberAddonPackage(join(project.baseDir, 'lib/some-addon'));
    const addonNode = projectGraph.addPackageToGraph(emberAddonPackage);
    expect(addonNode.content.synthetic).toBeFalsy();

    // Validate that addonn package has an the edge exists between
    expect(appNode.adjacent.has(addonNode)).toBe(true);
  });

  test('should stub a GraphNode and backfill for an app and addons ', async () => {
    // app uses a service `date` from `some-addon`
    // └── first-addon exposes `date` and consumes a service `time` from `another-addon`
    //     └── second-addon exposes a service `time`.

    const firstAddonName = 'first-addon';
    const secondAddonName = 'second-addon';

    const firstAddonFiles = merge(getEmptyInRepoAddonFiles(firstAddonName), {
      addon: {
        components: {},
        services: {
          'date.js': `
            import { inject as service } from '@ember/service';
            export default class DateService extends Service {
              @service('${secondAddonName}@time') t;
            }
          `,
        },
      },
      app: {
        components: {},
        services: {
          'date.js': `export { default } from '${firstAddonName}/services/date';`,
        },
      },
    });

    const secondAddonFiles = merge(getEmptyInRepoAddonFiles(secondAddonName), {
      addon: {
        components: {},
        services: {
          'time.js': `
              import { inject as service } from '@ember/service';
              export default class TimeService extends Service {}
            `,
        },
      },
      app: {
        components: {},
        services: {
          'time.js': `export { default } from '${secondAddonName}/services/time';`,
        },
      },
    });

    const project = getEmberProject('app');

    const files: Record<string, any> = {
      app: {
        components: {
          'obtuse.js': `
            import Component from '@glimmer/component';
            import { inject as service } from '@ember/service';

            export default class Obtuse extends Component {
              @service('${firstAddonName}@date') d;
            }
          `,
        },
      },
      lib: {},
    };

    files['lib'][firstAddonName] = firstAddonFiles;
    files['lib'][secondAddonName] = secondAddonFiles;

    project.mergeFiles(files);

    // Add addons to ember-addon entry in  package.json
    project.pkg['ember-addon'] = { paths: [`lib/${firstAddonName}`, `lib/${secondAddonName}`] };

    await setupProject(project);

    const m = new EmberAppProjectGraph(project.baseDir);

    const emberAppPackage = new EmberAppPackage(project.baseDir);
    const appNode = m.addPackageToGraph(emberAppPackage, false);

    const options: EmberAppPackageGraphOptions = { parent: appNode, project: m };
    emberAppPackage.getModuleGraph(options);

    // Validate that there is a syntehtic node to firstAddon and that there
    // is an edge between the app and the addon

    let firstAddonNode = m.graph.getNode(firstAddonName);
    expect(firstAddonNode?.content.synthetic).toBe(true);

    const firstAddonPackage = new EmberAddonPackage(join(project.baseDir, `lib/${firstAddonName}`));

    // Add firstAddon
    firstAddonNode = m.addPackageToGraph(firstAddonPackage);
    expect(firstAddonNode.content.synthetic).toBeFalsy();

    // Force populate the addon's graph by calling IPackage.getModuleGraph, this will
    // force discovery of the edge between firstAddon and secondAddon.
    const addonOptions = { parent: firstAddonNode, project: m };
    firstAddonPackage.getModuleGraph(addonOptions);

    // Get the synthetic secondAddon, validate it's been added and it stubbed out.
    let secondAddonNode = m.graph.getNode(secondAddonName);
    expect(secondAddonNode?.content.synthetic).toBe(true);
    expect(appNode.adjacent.has(firstAddonNode), 'app should depend on some-addon').toBe(true);
    expect(
      firstAddonNode.adjacent.has(secondAddonNode),
      'some-addon should depend on another-addon'
    ).toBe(true);

    const secondAddonPackage = new EmberAddonPackage(
      join(project.baseDir, `lib/${secondAddonName}`)
    );

    secondAddonNode = m.addPackageToGraph(secondAddonPackage);
    expect(secondAddonNode.content.synthetic).toBeFalsy();

    expect(
      firstAddonNode.adjacent.has(secondAddonNode),
      'some-addon should depend on another-addon'
    ).toBe(true);

    expect(flatten(m.graph.topSort()), 'package graph should have another-addon first').toEqual([
      'second-addon',
      'first-addon',
      'app-template',
    ]);
  });

  test('should stub a GraphNode and backfill for only addons', async () => {
    // app uses a service `date` from `some-addon`
    // └── first-addon exposes `date` and consumes a service `time` from `another-addon`
    //     └── second-addon exposes a service `time`.

    const firstAddonName = 'first-addon';
    const secondAddonName = 'second-addon';

    const firstAddonFiles = merge(getEmptyInRepoAddonFiles(firstAddonName), {
      addon: {
        components: {},
        services: {
          'date.js': `
                  import { inject as service } from '@ember/service';
                  export default class DateService extends Service {
                    @service('${secondAddonName}@time') t;
                  }
                `,
        },
      },
      app: {
        components: {},
        services: {
          'date.js': `export { default } from '${firstAddonName}/services/date';`,
        },
      },
    });

    const secondAddonFiles = merge(getEmptyInRepoAddonFiles(secondAddonName), {
      addon: {
        components: {},
        services: {
          'time.js': `
              import { inject as service } from '@ember/service';
              export default class TimeService extends Service {}
            `,
        },
      },
      app: {
        components: {},
        services: {
          'time.js': `export { default } from '${secondAddonName}/services/time';`,
        },
      },
    });

    const project = getEmberProject('app');

    const files: Record<string, any> = {
      lib: {},
    };

    files['lib'][firstAddonName] = firstAddonFiles;
    files['lib'][secondAddonName] = secondAddonFiles;

    project.mergeFiles(files);

    // Add addons to ember-addon entry in  package.json
    project.pkg['ember-addon'] = { paths: [`lib/${firstAddonName}`, `lib/${secondAddonName}`] };

    await setupProject(project);

    const m = new EmberAppProjectGraph(project.baseDir, { eager: false });

    const firstAddonPackage = new EmberAddonPackage(join(project.baseDir, `lib/${firstAddonName}`));

    const firstAddonNode = m.addPackageToGraph(firstAddonPackage);
    const addonOptions = { parent: firstAddonNode, project: m };
    firstAddonPackage.getModuleGraph(addonOptions);

    expect(firstAddonNode.content.synthetic).toBeFalsy();
    expect(
      firstAddonNode.content.pkg?.getModuleGraph().getNode('addon/services/date.js')?.content.parsed
    ).toBe(true);

    let secondAddonNode = m.graph.getNode(secondAddonName);
    expect(secondAddonNode?.content.synthetic).toBe(true);

    const secondAddonPackage = new EmberAddonPackage(
      join(project.baseDir, `lib/${secondAddonName}`)
    );

    secondAddonNode = m.addPackageToGraph(secondAddonPackage);
    expect(secondAddonNode.content.synthetic).toBeFalsy();

    expect(
      firstAddonNode.adjacent.has(secondAddonNode),
      'some-addon should depend on another-addon'
    ).toBe(true);

    expect(flatten(m.graph.topSort()), 'package graph should have another-addon first').toEqual([
      'second-addon',
      'first-addon',
    ]);
  });

  test('should stub a GraphNode and backfill when moduleName differs from packageName', async () => {
    // app uses a service `date` from `some-addon`
    // └── some-addon exposes `date`

    // We start creating the proejct graph

    // We add walk the app first
    // Then we walk the addon.

    // In this case, we are adding a PackageNode to the graph for some package
    // that we don't know exists yet.

    // We create an edge between the packages, but until we add the package
    // that has service.

    const someAddonName = 'special-addon';
    const someAddonModuleName = someAddonName;
    const someAddonPackageName = `@namespace/${someAddonModuleName}`;

    const someAddonFiles = merge(getEmptyInRepoAddonFiles(someAddonPackageName), {
      'index.js': `
        'use strict';

        module.exports = {
          name: '${someAddonModuleName}',
          moduleName: () => '${someAddonModuleName}',

          isDevelopingAddon() {
            return true;
          },
        };
      `,
      addon: {
        components: {},
        services: {
          'date.js': `
            import { inject as service } from '@ember/service';
            export default class DateService extends Service {}
          `,
        },
      },
      app: {
        components: {},
        services: {
          'date.js': `export { default } from '${someAddonModuleName}/services/date';`,
        },
      },
    });
    const project = getEmberProject('app');

    const files: Record<string, any> = {
      app: {
        components: {
          'obtuse.js': `
            import Component from '@glimmer/component';
            import { inject as service } from '@ember/service';

            export default class Obtuse extends Component {
              @service('${someAddonModuleName}@date') d;
            }
          `,
        },
      },
      lib: {},
    };

    files['lib'][someAddonModuleName] = someAddonFiles;

    project.mergeFiles(files);

    // Add addons to ember-addon entry in  package.json
    project.pkg['ember-addon'] = { paths: [`lib/${someAddonName}`] };

    await setupProject(project);

    const projectGraph = new EmberAppProjectGraph(project.baseDir);

    // Add the app to the project graph
    const emberAppPackage = new EmberAppPackage(project.baseDir);
    const appNode = projectGraph.addPackageToGraph(emberAppPackage, false);

    const options: EmberAppPackageGraphOptions = { parent: appNode, project: projectGraph };
    emberAppPackage.getModuleGraph(options);

    // Validate that there is a syntehtic node to firstAddon and that there
    // is an edge between the app and the addon

    expect(appNode.adjacent.has(projectGraph.graph.getNode(someAddonModuleName))).toBe(true);
    expect(projectGraph.graph.hasNode(someAddonPackageName)).toBe(false);

    const someAddonNode = projectGraph.graph.getNode(someAddonModuleName);
    expect(someAddonNode?.content.synthetic).toBe(true);

    // Create addon package
    const somePackage = new EmberAddonPackage(join(project.baseDir, `lib/${someAddonName}`));

    // Add package to graph
    const someNode = projectGraph.addPackageToGraph(somePackage);

    expect(appNode.adjacent.has(projectGraph.graph.getNode(someAddonModuleName))).toBe(true);
    expect(appNode.adjacent.has(projectGraph.graph.getNode(someAddonPackageName))).toBe(true);

    expect(someNode.content.synthetic, 'the node on the graph should be replaced').toBeFalsy();
  });

  describe('support .gjs file format', () => {
    test('should parse a .gjs file', async () => {
      const project = getEmberProject('app');

      project.mergeFiles({
        app: {
          components: {
            'example.gjs': `
              import Component from '@glimmer/component';

              const divide = () => 4 / 2;
          
              const First = <template>Hello</template>
          
              class Second extends Component {
                <template>world</template>
              }
          
              <template>
                <First/>, <Second/>!
              </template>
            `,
          },
        },
      });

      await setupProject(project);
      const p = new EmberAppPackage(project.baseDir);
      const packageGraph: Graph<ModuleNode> = new EmberAppPackageGraph(p).discover();

      expect(packageGraph.hasNode('app/components/example.gjs')).toBeTruthy();
    });

    test('should have edges between imports from .gjs file', async () => {
      const project = getEmberProject('app');

      project.mergeFiles({
        app: {
          components: {
            'trunk.gjs': `
              import Branch from './branch'; 

              <template>
                <Branch/>
              </template>
            `,
            'branch.gjs': `
              import Component from '@glimmer/component';
              import Leaf from './leaf';

              export default class Branch extends Component {

                get name() {
                  return 'Littlest';
                }

                <template><Leaf @name={{this.name}}/></template>
              };
            `,
            'leaf.gjs': `
              const Flea = <template>
                <p>Hello, {{@name}}!</p>
              </template>;
              
              <template>
                <Flea @name={{@name}}/>
              </template>
            `,
          },
        },
      });

      await setupProject(project);

      const p = new EmberAppPackage(project.baseDir);
      const options = {};
      const packageGraph: Graph<ModuleNode> = new EmberAppPackageGraph(p, options).discover();

      const trunkNode = packageGraph.getNode('app/components/trunk.gjs');
      const branchNode = packageGraph.getNode('app/components/branch.gjs');
      const leafNode = packageGraph.getNode('app/components/leaf.gjs');

      expect(
        trunkNode.adjacent.has(branchNode),
        'root.gjs should have edge with branch.gjs'
      ).toBeTruthy();
      expect(
        branchNode.adjacent.has(leafNode),
        'branch.gjs should have edge with leaf.gjs'
      ).toBeTruthy();
    });
  });
});
