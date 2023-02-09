import { join } from 'path';
import { describe, expect, test } from 'vitest';
import {
  getEmberProject,
  getEmberProjectFixture,
  getEmptyInRepoAddonFiles,
  setupProject,
} from '@rehearsal/test-support';

import merge from 'lodash.merge';
import { EmberAppPackage } from '../../src/entities/ember-app-package';
import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import {
  EmberAppPackageGraph,
  EmberAppPackageGraphOptions,
} from '../../src/entities/ember-app-package-graph';
import { EmberAppProjectGraph } from '../../src/entities/ember-app-project-graph';
import type { ModuleNode, PackageNode, Graph, GraphNode } from '@rehearsal/migration-graph-shared';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('Unit | EmberAppPackageGraph', () => {
  test('should determine what graph to create (e.g. library | app | addon)', async () => {
    const project = await getEmberProjectFixture('app');

    const output: Graph<ModuleNode> = new EmberAppPackageGraph(
      new EmberAppPackage(project.baseDir)
    ).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ]);
  });

  test('should produce a graph from an ember app', async () => {
    const project = await getEmberProjectFixture('app');

    const p = new EmberAppPackage(project.baseDir);
    const options = {};
    const output: Graph<ModuleNode> = new EmberAppPackageGraph(p, options).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ]);
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

    files.lib[firstAddonName] = firstAddonFiles;
    files.lib[secondAddonName] = secondAddonFiles;

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

    files.lib[firstAddonName] = firstAddonFiles;
    files.lib[secondAddonName] = secondAddonFiles;

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

    files.lib[someAddonModuleName] = someAddonFiles;

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
});
