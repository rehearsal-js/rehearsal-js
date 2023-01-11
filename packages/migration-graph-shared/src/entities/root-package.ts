import { relative } from 'path';
import { getWorkspaceGlobs } from '../utils/workspace';
import { Package, PackageOptions } from './package';

export class RootPackage extends Package {
  #globs: Array<string>;

  constructor(rootDir: string, options?: PackageOptions) {
    super(rootDir, options);

    // Determine if this package.json has a workspace entry
    const globs = getWorkspaceGlobs(this.packagePath);

    // Add the workspace globs to the exclude pattern for the root package
    // so it doesn't attempt to add them to the root package's graph.
    globs.forEach((glob) => this.addExcludePattern(relative(this.packagePath, glob)));

    this.#globs = globs;
  }

  get globs(): Array<string> {
    return this.#globs;
  }
}
