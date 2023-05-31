import { PackageJson } from 'type-fest';
import { EmberSpecificPackageJson } from './utils/read-package-json.js';

export type ImportScanner = (contentType: 'ecmascript' | 'typescript', content: string) => string[];

export type ResolvePackage = (options: HandleImportOptions) => ResolvedPackage;

export type ResolvePackageName = (rootPath: string) => string | undefined;

export type ResolvedPackage = {
  packageRoot: string;
  packageJson: PackageJson;
  filePath: string;
  isMissing: boolean;
  internal: boolean;
};

export interface HandleImportOptions {
  importer: string;
  rootPath: string;
  importee: string;
  packageRoots: string[];
  packageJsons: EmberSpecificPackageJson[];
}
