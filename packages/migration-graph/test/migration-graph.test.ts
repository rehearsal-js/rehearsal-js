import { describe, expect, test } from 'vitest';
import { getEmberProjectFixture, getLibraryProjectFixture } from '@rehearsal/test-support';
import { SourceType } from '../src/source-type';
import { buildMigrationGraph } from '../src/migration-graph';

describe('migration-graph', () => {
  test('should create ProjectGraph', async () => {
    const project = await getLibraryProjectFixture('simple');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);
    expect(projectGraph.graph.topSort().length).toBe(1);
    expect(sourceType).toBe(SourceType.Library);
  });
  test('should create EmberAppProjectGraph', async () => {
    const project = await getEmberProjectFixture('app');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);
    expect(projectGraph.graph.topSort().length).toBe(1);
    expect(sourceType).toBe(SourceType.EmberApp);
  });
  test('should create EmberAddonProjectGraph', async () => {
    const project = await getEmberProjectFixture('addon');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);
    expect(projectGraph.graph.topSort().length).toBe(1);
    expect(sourceType).toBe(SourceType.EmberAddon);
  });
});
