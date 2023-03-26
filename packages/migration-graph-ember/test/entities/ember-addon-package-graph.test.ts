import { afterEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { getEmberProject, setupProject } from '@rehearsal/test-support';
import { EmberAddonPackage } from '../../src/entities/ember-addon-package.js';
import { EmberAddonPackageGraph } from '../../src/entities/ember-addon-package-graph.js';

describe('Unit | EmberAddonPackageGraph', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('should not include app/ dir in module graph', async () => {
    project = getEmberProject('addon');

    await setupProject(project);

    const addonPackage = new EmberAddonPackage(project.baseDir);
    const addonPackageGraph = new EmberAddonPackageGraph(addonPackage);
    addonPackageGraph.discover();

    expect(addonPackageGraph.graph.hasNode('addon/components/greet.js')).toBeTruthy();
    expect(addonPackageGraph.graph.hasNode('app/components/greet.js')).toBeFalsy();
  });

  test('should create an edge between files when path references moduleName', async () => {
    // Some addons
    // Use Case where an addon is reference files from within the addon but using the modulenName in the path
    // e.g. moduleName of some-module
    // Som
    // `import MyComponent from 'some-module/components/some-component';

    project = getEmberProject('addon');

    project.mergeFiles({
      addon: {
        components: {
          'trunk.gjs': `
            import Branch from 'addon-template/components/branch';

            <template>
              <Branch/>
            </template>
          `,
          'branch.gjs': `
            import Component from '@glimmer/component';
            import Leaf from 'addon-template/components/leaf';

            export default class Branch extends Component {
              <template><Leaf/></template>
            };
          `,
          'leaf.gjs': `
            const Flea = <template>
              <p>Hello, {{@name}}!</p>
            </template>;

            <template>
              <Flea @name="Littlest"/>
            </template>
          `,
        },
      },
    });

    await setupProject(project);

    const addonPackage = new EmberAddonPackage(project.baseDir);
    const addonPackageGraph = new EmberAddonPackageGraph(addonPackage);
    const graph = addonPackageGraph.discover();

    const trunkNode = graph.getNode('addon/components/trunk.gjs');
    const branchNode = graph.getNode('addon/components/branch.gjs');
    const leafNode = graph.getNode('addon/components/leaf.gjs');

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
