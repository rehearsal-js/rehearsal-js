import { resolve } from 'path';
import { existsSync, writeJSONSync, readJSONSync, readFileSync, mkdirSync } from 'fs-extra';
import execa from 'execa';

export type Store = {
  name: string;
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
  completeFileCount: number;
  inProgressFileCount: number;
  totalFileCount: number;
};

const DEFAULT_REHEARSAL_PATH = resolve(process.cwd(), '.rehearsal');
const DEFAULT_CONFIG_PATH = resolve(DEFAULT_REHEARSAL_PATH, 'migrate-state.json');
const REHEARSAL_TODO_REGEX = /@rehearsal TODO/g;

export class State {
  private configPath: string;
  private store: Store;
  constructor(name: string, packages: string[] = [], configPath: string = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
    let store;
    if (this.isStateExists()) {
      store = this.verifyState();
    } else {
      const initPackageMap: PackageMap = {};
      const packageMap: PackageMap = packages.reduce((map, current) => {
        map[current] = [];
        return map;
      }, initPackageMap);
      store = { name, packageMap, files: {} };
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
  verifyState(): Store {
    const store: Store = readJSONSync(this.configPath);
    for (const f in store.files) {
      const status = store.files[f];
      if (!status.current || !existsSync(status.current)) {
        // if a ts file in state doesn't exist on disk, mark it as un-migrated
        store.files[f].current = null;
      }
    }
    return store;
  }

  isStateExists(): boolean {
    if (!existsSync(DEFAULT_REHEARSAL_PATH)) {
      mkdirSync(DEFAULT_REHEARSAL_PATH);
    }
    return existsSync(this.configPath);
  }

  saveState(): void {
    writeJSONSync(this.configPath, this.store, { spaces: 2 });
  }

  addFilesToPackage(packageName: string, files: string[]): void {
    const fileMap: FileStateMap = {};
    // save files to package map for easier retrieve
    this.store.packageMap[packageName] = files;

    files.forEach(
      (f) =>
        (fileMap[f] = {
          origin: f.replace('.ts', '.js'),
          current: f,
          package: packageName,
          errorCount: calculateTSError(f as string),
        })
    );
    this.store.files = { ...this.store.files, ...fileMap };
    this.saveState();
  }

  // TODO
  // 1. function to get how many files have been migrated to TS in a package
  // 2. funciton to get how many TODO left in a package

  getPackageMigrateProgress(packageName: string): PackageMigrateProgress {
    const fileList = this.store.packageMap[packageName];
    let completeFileCount = 0;
    let inProgressFileCount = 0;
    fileList.forEach((f) => {
      const fileState = this.store.files[f];
      if (fileState.errorCount === 0) {
        completeFileCount++;
      } else {
        inProgressFileCount++;
      }
    });
    return {
      completeFileCount,
      inProgressFileCount,
      totalFileCount: completeFileCount + inProgressFileCount,
    };
  }

  async addStateFileToGit(): Promise<void> {
    try {
      // check if git history exists
      await execa('git', ['status']);
      await execa('git', ['add', this.configPath]);
    } catch (e) {
      // no ops
    }
  }
}

export function calculateTSError(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  return (content.match(REHEARSAL_TODO_REGEX) || []).length;
}
