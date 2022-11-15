import { describe, expect, test } from 'vitest';
import { getEmberProject, setupProject } from '@rehearsal/test-support';
import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import { EmberAddonPackageGraph } from '../../src/entities/ember-addon-package-graph';

describe('EmberAddonPackageDependencyGraph', () => {
  test('should create an edge between app/components/<file>.js and addon/components/<file>.js', async () => {
    const project = getEmberProject('addon');

    await setupProject(project);

    const addonPackage = new EmberAddonPackage(project.baseDir);

    const addonPackageGraph = new EmberAddonPackageGraph(addonPackage);
    addonPackageGraph.discover();

    const implNode = addonPackageGraph.graph.getNode('addon/components/greet.js');
    const interfaceNode = addonPackageGraph.graph.getNode('app/components/greet.js');
    expect(interfaceNode.adjacent.has(implNode)).toBe(true);
  });
});
