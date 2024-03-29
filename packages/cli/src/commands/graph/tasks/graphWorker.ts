import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { lstat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import {
  Resolver,
  topSortFiles,
  discoverServiceDependencies,
  getExcludePatterns,
  SUPPORTED_EXTENSION,
  type PackageGraph,
  generateDotLanguage,
  type FileNode,
  generateJson,
} from '@rehearsal/migration-graph';
import FastGlob from 'fast-glob';
import { GraphWorkerOptions } from './types.js';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  const { srcPath, rootPath, output, ignore, externals, serviceMap } = JSON.parse(
    workerData as string
  ) as GraphWorkerOptions;

  const serviceResolver = discoverServiceDependencies(serviceMap);
  const resolver = new Resolver({
    rootPath,
    scanForImports: serviceResolver,
    ignore,
    includeExternals: !!(externals && output),
  });
  const absolutePath = resolve(rootPath, srcPath);
  const files = await getFiles(absolutePath, srcPath, ignore);

  await resolver.load();

  for (const file of files) {
    resolver.walk(file);
  }

  const sortedNodes = topSortFiles(resolver.graph);
  const sortedFiles = sortedNodes.map((file) => {
    return file.id;
  });

  if (output) {
    parentPort?.postMessage({ type: 'message', content: `Writing graph to ${output} ...` });
    await writeOutput(rootPath, resolver.graph, sortedNodes, output);
  }

  parentPort?.postMessage({ type: 'files', content: sortedFiles });
}

function buildGlobPath(extensions: ReadonlyArray<string>): string {
  return extensions.map((ext) => ext.replace('.', '')).join(',');
}

export async function isDirectory(absolutePath: string, srcPath: string): Promise<boolean> {
  try {
    const stat = await lstat(absolutePath);
    return stat.isDirectory();
  } catch (e) {
    if (e instanceof Error && 'code' in e) {
      if (e.code === 'ENOENT') {
        throw new Error(`'${srcPath}' does not exist.`);
      }
    }
  }

  return false;
}

export async function getFiles(
  absolutePath: string,
  srcPath: string,
  ignore: string[]
): Promise<string[]> {
  let files: string[] = [];
  const isDir = await isDirectory(absolutePath, srcPath);

  if (isDir) {
    files = FastGlob.sync(`${absolutePath}/**/*.{${buildGlobPath(SUPPORTED_EXTENSION)}}`, {
      ignore: ['**/node_modules/**', ...getExcludePatterns(), '**/*.d.ts', ...ignore],
    });
  } else {
    files.push(absolutePath);
  }

  return files;
}

export async function writeOutput(
  rootPath: string,
  graph: PackageGraph,
  order: FileNode[],
  output: string
): Promise<void> {
  const ext = extname(output);
  if (ext === '.dot') {
    const dot = generateDotLanguage(graph, { hideHbs: true });
    await writeFile(output, dot);
  } else {
    const json = generateJson(rootPath, graph, order, { hideHbs: true });
    await writeFile(output, json);
  }
}
