import { resolve } from 'path';
import { existsSync, writeJSONSync, readJSONSync, readFileSync, mkdirSync } from 'fs-extra';
import execa from 'execa';

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

const DEFAULT_REHEARSAL_PATH = resolve(process.cwd(), '.rehearsal');
const DEFAULT_CONFIG_PATH = resolve(DEFAULT_REHEARSAL_PATH, 'migrate-state.json');
const REHEARSAL_TODO_REGEX = /@rehearsal TODO/g;

export class State {
  private configPath: string;
  private store: Store;
  constructor(
    name: string | null,
    packages: string[] = [],
    configPath: string = DEFAULT_CONFIG_PATH
  ) {
    this.configPath = configPath;
    let store;
    if (this.isStateExists()) {
      // every time loading a previous state, need to check if files on disk matches the state
      store = this.getVerifiedStore();
    } else {
      const initPackageMap: PackageMap = {};
      const packageMap: PackageMap = packages.reduce((map, current) => {
        map[current] = [];
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
      if (status.current && !existsSync(status.current)) {
        // if a ts file in state doesn't exist on disk, mark it as un-migrated
        store.files[f].current = null;
      }
      // update ts-ignore count
      store.files[f].errorCount = calculateTSIgnoreCount(f);
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
          errorCount: calculateTSIgnoreCount(f as string),
        })
    );
    this.store.files = { ...this.store.files, ...fileMap };
    this.saveState();
  }

  getPackageMigrateProgress(packageName: string): PackageMigrateProgress {
    const fileList = this.store.packageMap[packageName];
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

  getPackageErrorCount(packageName: string): number {
    const fileList = this.store.packageMap[packageName];
    let errorCount = 0;
    fileList.forEach((f) => {
      const fileState = this.store.files[f];
      errorCount += fileState.errorCount;
    });
    return errorCount;
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

export function calculateTSIgnoreCount(filePath: string): number {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    return (content.match(REHEARSAL_TODO_REGEX) || []).length;
  } else {
    return 0;
  }
}
