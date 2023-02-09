import { describe, expect, test } from 'vitest';
import { getEmberProject, setupProject } from '@rehearsal/test-support';
import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import { EmberAddonPackageGraph } from '../../src/entities/ember-addon-package-graph';

describe('Unit | EmberAddonPackageGraph', () => {
  test('should create an edge between app/ files in addons module graph', async () => {
    const project = getEmberProject('addon');

    await setupProject(project);

    const addonPackage = new EmberAddonPackage(project.baseDir);
    const addonPackageGraph = new EmberAddonPackageGraph(addonPackage);
    addonPackageGraph.discover();

    expect(addonPackageGraph.graph.hasNode('addon/components/greet.js')).toBeTruthy();
    expect(addonPackageGraph.graph.hasNode('app/components/greet.js')).toBeFalsy();
  });
});
