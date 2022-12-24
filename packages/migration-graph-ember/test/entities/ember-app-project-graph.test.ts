import { describe, expect, test } from 'vitest';
import { getEmberProject, setupProject } from '@rehearsal/test-support';
import { EmberAppPackage } from '../../src/entities/ember-app-package';
import { EmberAppProjectGraph } from '../../src/entities/ember-app-project-graph';

describe('EmberAppProjectGraph', () => {
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

    // Create an app where the app uses a service with ambigous coordinates

    // package.name is @some-org/some-addon

    // Usage is like:
    // @service('some-addon@some-service') myService

    // The problem here is that the left-part of the coordinates are ember-addon-name and not package.name

    // We put packages in the graph by their packageName

    // This tests the logic in EmberAppProjectGrpah.addPackageToGrpah()

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
});
