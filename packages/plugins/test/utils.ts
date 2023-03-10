import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createSourceFile, DiagnosticWithLocation } from 'typescript';
import { PluginsRunnerContext, RehearsalService } from '@rehearsal/service';
import { Reporter } from '@rehearsal/reporter';
import { Project } from 'fixturify-project';

export function mockDiagnosticWithLocations(
  partials: Partial<DiagnosticWithLocation>[]
): DiagnosticWithLocation[] {
  return partials.map((partial) => mockDiagnosticWithLocation(partial));
}

export function mockDiagnosticWithLocation(
  partial: Partial<DiagnosticWithLocation>
): DiagnosticWithLocation {
  return {
    file: createSourceFile('test.ts', '', 99),
    start: 0,
    length: 0,
    category: 1,
    code: 0,
    messageText: '',
    ...partial,
  };
}

export async function initProject(
  name: string,
  files: { [key: string]: string }
): Promise<Project> {
  const project: Project = new Project(name, '0.0.0');

  // Delete default file
  delete project.files['index.js'];

  for (const target in files) {
    project.files[target] = await readFile(files[target], 'utf-8');
  }

  await project.write();

  return project;
}

export function mockPluginRunnerContext(project: Project): PluginsRunnerContext {
  const fileNames = Object.keys(project.files).map((file) => resolve(project.baseDir, file));
  const rehearsal = new RehearsalService({ baseUrl: project.baseDir }, fileNames);
  const reporter = new Reporter({
    tsVersion: '',
    projectName: '@rehearsal/test',
    basePath: project.baseDir,
    commandName: '@rehearsal/migrate',
  });

  return { basePath: project.baseDir, rehearsal, reporter };
}
