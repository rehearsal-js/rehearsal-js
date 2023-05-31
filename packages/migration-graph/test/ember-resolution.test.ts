import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Project } from 'fixturify-project';
import { findModuleName } from '../src/ember/resolution.js';

describe('findModuleName', () => {
  let project: Project;
  beforeEach(async () => {
    project = new Project();

    project.files = {
      'name.js': `module.exports = { name: "jokes" };`,
      'moduleName.js': `module.exports = { moduleName() { return "jokes" } };`,
      'moduleNameFunc.js': `module.exports = { moduleName: () => "jokes" };`,
      'moduleNameFuncReturn.js': `module.exports = { moduleName: () => { return "jokes" } };`,
      'both.js': `module.exports = { name: 'lulz', moduleName: () => "jokes" };`,
      'kitchen-sink.js': `module.exports = { name: 'wat', moduleName() { return "geez" }, treeForVendor() { return "haha" }, include() {} }`,
      'runtime.js': `module.exports = { name: bar() }; function bar() { return "rely-on-runtime"}`,
    };

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('finds name field', () => {
    expect(findModuleName(project.baseDir + '/name.js')).toBe('jokes');
  });

  test('finds moduleName method', () => {
    expect(findModuleName(project.baseDir + '/moduleName.js')).toBe('jokes');
  });

  test('finds moduleName function with implicit return', () => {
    expect(findModuleName(project.baseDir + '/moduleNameFunc.js')).toBe('jokes');
  });

  test('finds moduleName function with explicit return', () => {
    expect(findModuleName(project.baseDir + '/moduleNameFuncReturn.js')).toBe('jokes');
  });

  test('selects moduleName over name', () => {
    expect(findModuleName(project.baseDir + '/both.js')).toBe('jokes');
  });

  test('kitchen sink', () => {
    expect(findModuleName(project.baseDir + '/kitchen-sink.js')).toBe('geez');
  });

  test('kitchen sink', () => {
    expect(
      findModuleName(project.baseDir + '/runtime.js'),
      'cannot find the name will use runtime resolution'
    ).toBe(undefined);
  });
});
