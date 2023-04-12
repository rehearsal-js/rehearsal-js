import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Project } from 'fixturify-project';
import { EmberAppProjectGraph } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/monorepo');

describe('discover-ember-packages', () => {
  let projectGraph: EmberAppProjectGraph;
  let project: Project;
  beforeEach(async () => {
    project = Project.fromDir(FIXTURE_APP_PATH, { linkDeps: true, linkDevDeps: true });
    project.addDevDependency('ember-source');
    await project.write();
    projectGraph = new EmberAppProjectGraph(project.baseDir);
  });

  afterEach(() => {
    project.dispose();
  });

  test('returns the graph in top sort order', () => {
    projectGraph.discover();
    const nodes = projectGraph.graph.topSort();

    expect(nodes.map((n) => n.content.pkg?.packageName)).toEqual([
      '@company/b',
      '@company/a',
      '@company/c',
      '@company/d',
      'monorepo',
    ]);
  });
});
