import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
import { readJSONSync } from 'fs-extra';
import { resolve, dirname } from 'path';
import { describe, test } from 'vitest';

import {
  // CompilerOptions,
  // DiagnosticWithLocation,
  findConfigFile,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript';
import { RehearsalService } from '../src';

describe('Test service', function () {
  test('should pass', () => {
    const basePath = resolve(__dirname, '../../../packages/test-support/fixtures/glint');
    console.log('basePath', basePath);

    const configFile = findConfigFile(basePath, sys.fileExists, 'tsconfig.json');
    if (!configFile) {
      throw Error('configFile not found');
    }
    const { config } = readConfigFile(configFile, sys.readFile);

    const parsed = parseJsonConfigFileContent(config, sys, dirname(configFile), {}, configFile);

    const service = new RehearsalService(parsed.options, parsed.fileNames, basePath);
    const diagnostics = service.getGlintDiagnostics(parsed.fileNames[0]);
    console.log('diagnostics--------', diagnostics);
  });
});
