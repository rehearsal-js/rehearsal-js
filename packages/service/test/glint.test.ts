import { readJSONSync } from 'fs-extra';
import { resolve, dirname } from 'path';
import { describe, test, beforeEach } from 'vitest';
import { dirSync, setGracefulCleanup, DirResult } from 'tmp';
import { Project } from 'fixturify-project';

import {
  // CompilerOptions,
  // DiagnosticWithLocation,
  findConfigFile,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript';
import { getGlintProject } from '@rehearsal/test-support/src/project';
import { RehearsalService } from '../src';

// setGracefulCleanup();

describe('Test service', function () {
  let basePath: string;
  let tmpDir: DirResult;
  let project: Project;

  async function setupGlintProject(): Promise<Project> {
    tmpDir = dirSync({ unsafeCleanup: true });
    basePath = tmpDir.name;
    project = getGlintProject();
    project.baseDir = basePath;
    await project.write();
    return project;
  }

  beforeEach(async () => {
    setupGlintProject();
  });

  test('should pass', () => {
    console.log('basePath', basePath);
    const configFile = findConfigFile(basePath, sys.fileExists, 'tsconfig.json');
    if (!configFile) {
      // throw Error('configFile not found');
      console.log('configFile not found');
      return;
    }
    const { config } = readConfigFile(configFile, sys.readFile);

    const parsed = parseJsonConfigFileContent(config, sys, dirname(configFile), {}, configFile);
    console.log('fileNames', parsed.fileNames);

    const service = new RehearsalService(parsed.options, parsed.fileNames, basePath);
    // let arr = [];
    // for (const file of parsed.fileNames) {
    //   const diagnostics = service.getGlintDiagnostics(file);
    //   console.log('diagnostics', diagnostics);
    //   arr = [...arr, ...diagnostics];
    // }

    const target = resolve(basePath, 'test-component.hbs');
    console.log('target', target);
    const diagnostics1 = service.getGlintDiagnostics(target);
    console.log('diagnostics1--------', diagnostics1);
  });
});
