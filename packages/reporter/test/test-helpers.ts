import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { Project } from 'fixturify-project';
import { readJSON } from '@rehearsal/utils';

import type { Run } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eg. rehearsal-report.json
export function prepareProject(fileName: string): Project {
  const fixtureReport = resolve(__dirname, 'fixtures', fileName);
  const project = new Project();

  project.files[fileName] = readFileSync(fixtureReport, 'utf-8');

  return project;
}

export function getJSONReport(jsonFilepath: string): Run {
  return readJSON(resolve(__dirname, 'fixtures', jsonFilepath)) as Run;
}
