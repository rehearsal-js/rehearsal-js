import { describe, expect, test, afterEach } from 'vitest';
import { getEmberProjectFixture, getLibraryProjectFixture } from '@rehearsal/test-support';
import { Project } from 'fixturify-project';
import { SourceType } from '../src/source-type.js';
import { buildMigrationGraph } from '../src/migration-graph.js';

describe('migration-graph', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('should create ProjectGraph', async () => {
    project = await getLibraryProjectFixture('simple');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir, project.baseDir, {
      basePath: project.baseDir,
      deps: true,
      devDeps: true,
      ignore: [],
    });
    expect(projectGraph.graph.getSortedNodes().length).toBe(1);
    expect(sourceType).toBe(SourceType.Library);
  });
  test('should create EmberAppProjectGraph', async () => {
    project = await getEmberProjectFixture('app');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir, project.baseDir, {
      basePath: project.baseDir,
      deps: true,
      devDeps: true,
      ignore: [],
    });
    expect(projectGraph.graph.getSortedNodes().length).toBe(1);
    expect(sourceType).toBe(SourceType.EmberApp);
  });
  test('should create EmberAddonProjectGraph', async () => {
    project = await getEmberProjectFixture('addon');
    const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir, project.baseDir, {
      basePath: project.baseDir,
      deps: true,
      devDeps: true,
      ignore: [],
    });
    expect(projectGraph.graph.getSortedNodes().length).toBe(1);
    expect(sourceType).toBe(SourceType.EmberAddon);
  });
});
