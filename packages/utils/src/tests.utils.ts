import fs from 'fs';
import { basename, extname, resolve } from 'path';

/**
 * Copies files with inputFilesExtension from a templateDirectory (not recursive) to fixturesDirectory
 * with removing templateExtension from filenames.
 *
 * Returns the list of copied and renamed file names from fixturesDirectory.
 *
 * For example make a copy of `example.tsx.input` as `example.tsx` if templateExtension is `.input`
 */
export function createFixturesFromTemplateFiles(
  templateDirectory: string,
  fixturesDirectory: string,
  templateExtension = '.input'
): string[] {
  return fs
    .readdirSync(templateDirectory) // Takes all files from sourceDirectory
    .filter((file) => extname(file).toLowerCase() === templateExtension) // Filter inputFilesExtension files
    .map((file) => {
      const targetFileName = basename(file, templateExtension);
      fs.copyFileSync(resolve(templateDirectory, file), resolve(fixturesDirectory, targetFileName));

      return targetFileName;
    });
}

/**
 * Removes files from fixturesDirectory with corresponding to templateDirectory with templateExtension files.
 * If the `templateDirectory` has files with `templateExtension`, the same files without templateExtension
 * will be removed from `fixturesDirectory`.
 *
 * Additionally, files with `additionalFiles` names will be removed as well.
 *
 * @return The list of removed files names
 */
export function cleanFixturesFiles(
  fixturesDirectory: string,
  templateDirectory: string,
  additionalFileNames: string[] = [],
  templateExtension = '.output'
): string[] {
  return fs
    .readdirSync(templateDirectory) // Takes all files from `templateDirectory
    .filter((file) => extname(file).toLowerCase() === templateExtension) // Filter `templateExtension` files
    .map((file) => basename(file, templateExtension)) // Remove `templateExtension` from file names
    .concat(additionalFileNames) // Include `additionalFileNames` to the list of files to be removed
    .filter((file) => fs.existsSync(resolve(fixturesDirectory, file))) // Filter out non-existing files
    .map((file) => {
      fs.rmSync(resolve(fixturesDirectory, file));

      return file;
    });
}
