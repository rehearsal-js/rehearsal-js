import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
import { readJSONSync } from 'fs-extra';
import { resolve, dirname } from 'path';
import { describe, test } from 'vitest';

import {
  CompilerOptions,
  DiagnosticWithLocation,
  findConfigFile,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript';
import { RehearsalService } from '../src';

describe('Test service', function () {
  // mkdirSync(resolve(__dirname, 'temp'));
  // const basePath = resolve(__dirname, 'tmp');
  // const fixturePath = resolve(__dirname, 'fixtures', 'glimmer');
  // const fileName = resolve(fixturePath, 'components', 'TestPage.ts');

  // const originalConfigPath = resolve(__dirname, 'tsconfig.json');
  // const fileNames = [fileName];
  // // const originalFileContent = readFileSync(fileName).toString();
  // copyFileSync(originalConfigPath, resolve(basePath, 'tsconfig.json'));

  const basePath = resolve(__dirname, 'fixtures', 'glimmer');

  const configFile = findConfigFile(basePath, sys.fileExists, 'tsconfig.json');
  if (!configFile) {
    throw Error('configFile not found');
  }
  const { config } = readConfigFile(configFile, sys.readFile);

  const parsed = parseJsonConfigFileContent(config, sys, dirname(configFile), {}, configFile);

  console.log(parsed);
  // const configPath = resolve(basePath, 'tsconfig.json');

  const service = new RehearsalService(parsed.options, parsed.fileNames, basePath);
  const diagnostics = service.getGlintDiagnostics(parsed.fileNames[0]);
  console.log(diagnostics);
  test('should pass', () => {
    console.log(1 + 1);
  });
});
