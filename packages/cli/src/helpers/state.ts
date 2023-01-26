import { resolve } from 'path';
import { existsSync, writeJSONSync, readJSONSync, readFileSync, mkdirSync } from 'fs-extra';

import { git } from '../utils';

// The reaosn to have packageMap is getting all files in a package faster
// than loop through everyhing in the files
export type Store = {
  name: string | null;
  packageMap: PackageMap;
  files: FileStateMap;
};

// represent single file state
type FileState = {
  origin: string;
  current: string | null;
  package: string;
  errorCount: number;
};

// use file path as key
export type FileStateMap = {
  [key: string]: FileState;
};

// help to get all files from a package instead of looping all files
type PackageMap = {
  [key: string]: string[];
};

type PackageMigrateProgress = {
  migratedFileCount: number;
  totalFileCount: number;
  isCompleted: boolean;
};

const REHEARSAL_TODO_REGEX = /@rehearsal TODO/g;

function getRelativePath(basePath: string, filePath: string): string {
  return filePath.replace(basePath, '.');
}

function getAbsolutePath(basePath: string, filePath: string): string {
  return resolve(basePath, filePath);
}

export class State {
  private configPath: string;
  private basePath: string;
  private store: Store;
  constructor(name: string | null, basePath: string, packages: string[] = [], configPath?: string) {
    this.configPath = configPath
      ? configPath
      : resolve(basePath, '.rehearsal', 'migrate-state.json');
    this.basePath = basePath;
    let store;
    if (this.isStateExists()) {
      // every time loading a previous state, need to check if files on disk matches the state
      store = this.getVerifiedStore();
    } else {
      const initPackageMap: PackageMap = {};
      const packageMap: PackageMap = packages.reduce((map, current) => {
        map[getRelativePath(this.basePath, current)] = [];
        return map;
      }, initPackageMap);
      store = { name: name ? name : '', packageMap, files: {} };
    }
    this.store = store;
    this.saveState();
  }

  get packages(): PackageMap {
    return this.store.packageMap;
  }

  get files(): FileStateMap {
    return this.store.files;
  }

  // verify and update state based on files on disk
  getVerifiedStore(): Store {
    const store: Store = readJSONSync(this.configPath);
    for (const f in store.files) {
      const status = store.files[f];
      if (status.current) {
        const absoluteTsPath = getAbsolutePath(this.basePath, status.current);
        if (!existsSync(absoluteTsPath)) {
          // if a ts file in state doesn't exist on disk, mark it as un-migrated
          store.files[f].current = null;
        } else {
          // if ts is on disk, update ts-expect-error count
          store.files[f].errorCount = calculateTSIgnoreCount(absoluteTsPath);
        }
      }
    }
    return store;
  }

  isStateExists(): boolean {
    if (!existsSync(resolve(this.basePath, '.rehearsal'))) {
      mkdirSync(resolve(this.basePath, '.rehearsal'));
    }
    return existsSync(this.configPath);
  }

  saveState(): void {
    writeJSONSync(this.configPath, this.store, { spaces: 2 });
  }

  // files should be JS files
  addFilesToPackage(packageName: string, files: string[]): void {
    const fileMap: FileStateMap = {};
    const relativePackageName = getRelativePath(this.basePath, packageName);
    const fileListWithRelateivePath = files.map((f) => getRelativePath(this.basePath, f));
    // save files to package map for easier retrieve
    this.store.packageMap[relativePackageName] = fileListWithRelateivePath;

    fileListWithRelateivePath.forEach((f) => {
      const relativeTsPath = f.replace(/js$/g, 'ts');
      const absoluteTsPath = getAbsolutePath(this.basePath, relativeTsPath);
      const isConverted = existsSync(absoluteTsPath);
      fileMap[f] = {
        origin: f,
        current: isConverted ? relativeTsPath : null,
        package: relativePackageName,
        errorCount: isConverted ? calculateTSIgnoreCount(absoluteTsPath) : 0,
      };
    });
    this.store.files = { ...this.store.files, ...fileMap };
    this.saveState();
  }

  getPackageMigrateProgress(packageFullPath: string): PackageMigrateProgress {
    const packageRelativePath = getRelativePath(this.basePath, packageFullPath);
    const fileList = this.store.packageMap[packageRelativePath] || [];

    let migratedFileCount = 0;
    fileList.forEach((f) => {
      const fileState = this.store.files[f];
      if (fileState.current) {
        // if current is not null, then the migrated TS files should be there
        migratedFileCount++;
      }
    });
    return {
      migratedFileCount,
      totalFileCount: fileList.length,
      isCompleted: migratedFileCount === fileList.length,
    };
  }

  getPackageErrorCount(packageFullPath: string): number {
    const packageRelativePath = getRelativePath(this.basePath, packageFullPath);
    const fileList = this.store.packageMap[packageRelativePath] || [];
    let errorCount = 0;
    fileList.forEach((f) => {
      const fileState = this.store.files[f];
      errorCount += fileState.errorCount;
    });
    return errorCount;
  }

  async addStateFileToGit(): Promise<void> {
    if (await git.checkIsRepo()) {
      git.add(['add', this.configPath]);
    }
  }
}

// filePath is absolute path
export function calculateTSIgnoreCount(filePath: string): number {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    return (content.match(REHEARSAL_TODO_REGEX) || []).length;
  } else {
    return 0;
  }
}
