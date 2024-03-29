import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { RehearsalService } from '@rehearsal/service';
import { Reporter } from '@rehearsal/reporter';
import { Project } from 'fixturify-project';
import { PluginsRunnerContext } from '../src/plugin.js';

export async function initProject(
  name: string,
  files: { [key: string]: string }
): Promise<Project> {
  const project: Project = new Project(name, '0.0.0').clone();

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
    projectRootDir: project.baseDir,
  });

  return { basePath: project.baseDir, service: rehearsal, reporter };
}
