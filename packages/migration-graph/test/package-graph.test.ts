import { join } from 'node:path';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Project } from 'fixturify-project';
import { topSortFiles } from '../src/sort-graph.js';
import { PackageGraph } from '../src/project-graph.js';

describe('PackageGraph', () => {
  let project: Project;

  let a = '';
  let b = '';
  beforeEach(async () => {
    // use fixturify-project to give us temp files we can pass in
    project = new Project();
    project.files = {
      a: {
        'package.json': JSON.stringify({ name: 'package-a' }),
      },
      b: {
        'package.json': JSON.stringify({ name: 'package-b' }),
      },
    };

    await project.write();

    [a, b] = ['a', 'b'].map((dir) => join(project.baseDir, dir, 'package.json'));
  });

  afterEach(() => project.dispose());

  test('it works', () => {
    const graph = new PackageGraph();

    graph.addFileToPackage(a, '1.js');
    graph.addFileToPackage(a, '2.js');
    graph.addFileToPackage(b, '3.js');
    graph.addFileToPackage(b, '4.js');
    graph.addDependency('package-a', '1.js', 'package-b', '3.js');

    expect([...graph.packages.values()].map((pkg) => pkg.name)).toMatchObject([
      'package-a',
      'package-b',
    ]);

    expect(graph.hasFile('package-a', '1.js')).toBeTruthy();
    expect(graph.hasFile('package-a', '2.js')).toBeTruthy();
    expect(graph.hasFile('package-b', '3.js')).toBeTruthy();
    expect(graph.hasFile('package-b', '4.js')).toBeTruthy();
    expect(graph.hasFile('package-c', '1.js')).toBeFalsy();
    expect(graph.hasFile('package-a', '3.js')).toBeFalsy();
    expect(graph.hasFile('package-a', '5.js')).toBeFalsy();

    expect(graph.getPackageNameFromFileId('1.js')).toBe('package-a');
    expect(graph.getPackageNameFromFileId('3.js')).toBe('package-b');

    const packageA = graph.packages.get('package-a');

    expect(packageA?.getFileNode('1.js')?.edges.length).toBe(1);
    expect(packageA?.getFileNode('1.js')?.edges[0].id).toBe('3.js');
  });

  test('it works with cycles', () => {
    const graph = new PackageGraph();
    graph.addFileToPackage(a, '1.js');
    graph.addFileToPackage(a, '2.js');
    graph.addFileToPackage(a, '3.js');
    graph.addFileToPackage(b, '3.js');
    graph.addFileToPackage(b, '4.js');

    graph.addDependency('package-a', '1.js', 'package-a', '2.js');
    graph.addDependency('package-a', '2.js', 'package-a', '1.js');
    graph.addDependency('package-a', '2.js', 'package-b', '3.js');
    graph.addDependency('package-b', '3.js', 'package-a', '2.js');

    const packageA = graph.packages.get('package-a');
    const packageB = graph.packages.get('package-b');

    expect(packageA?.getFileNode('1.js')?.edges.length).toBe(1);
    expect(packageA?.getFileNode('2.js')?.edges.length).toBe(2);
    expect(packageB?.getFileNode('3.js')?.edges.length).toBe(1);
  });
});

describe('topSortFiles', () => {
  let project: Project;

  let a = '';
  let b = '';
  let c = '';
  beforeEach(async () => {
    // use fixturify-project to give us temp files we can pass in
    project = new Project();
    project.files = {
      a: {
        'package.json': JSON.stringify({ name: 'package-a' }),
      },
      b: {
        'package.json': JSON.stringify({ name: 'package-b' }),
      },
      c: {
        'package.json': JSON.stringify({ name: 'package-c' }),
      },
    };

    await project.write();

    [a, b, c] = ['a', 'b', 'c'].map((dir) => join(project.baseDir, dir, 'package.json'));
  });
  test('it works', () => {
    const graph = new PackageGraph();

    graph.addFileToPackage(a, '1.js');
    graph.addFileToPackage(a, '2.js');
    graph.addFileToPackage(a, '3.js');
    graph.addFileToPackage(b, '4.js');
    graph.addFileToPackage(b, '5.js');
    graph.addFileToPackage(c, '6.js');

    graph.addDependency('package-a', '1.js', 'package-a', '3.js');
    graph.addDependency('package-a', '3.js', 'package-b', '5.js');
    graph.addDependency('package-a', '1.js', 'package-b', '5.js');
    graph.addDependency('package-a', '2.js', 'package-b', '4.js');
    graph.addDependency('package-b', '4.js', 'package-c', '6.js');

    expect(topSortFiles(graph)).toMatchObject(['5.js', '3.js', '1.js', '6.js', '4.js', '2.js']);
  });

  test('it works with cycles', () => {
    const graph = new PackageGraph();

    graph.addFileToPackage(a, '1.js');
    graph.addFileToPackage(a, '2.js');
    graph.addFileToPackage(a, '3.js');
    graph.addFileToPackage(b, '3.js');
    graph.addFileToPackage(b, '4.js');

    graph.addDependency('package-a', '1.js', 'package-a', '2.js');
    graph.addDependency('package-a', '2.js', 'package-a', '1.js');
    graph.addDependency('package-a', '2.js', 'package-b', '3.js');
    graph.addDependency('package-b', '3.js', 'package-a', '2.js');

    expect(topSortFiles(graph)).toMatchObject(['3.js', '2.js', '1.js', '4.js']);
  });
});
