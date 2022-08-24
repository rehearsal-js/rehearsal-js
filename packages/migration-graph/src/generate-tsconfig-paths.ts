/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as jsoncParser from 'jsonc-parser';

type Paths = Record<string, string[]>;

const SOURCE = './packages/addons';
const BASE_TS_CONFIG_PATH = './tsconfig.base.json';
const BASE_TS_CONFIG = fs.readFileSync(BASE_TS_CONFIG_PATH);

/**
 * search the packages/addons directory for all packages which contain a tsconfig file. For each
 * of these files, we programmatically build the compilerOptions.paths field which will be used
 * in our global tsconfig.base.json file.
 *
 * @returns Paths object which maps a package name to a path that the ember ecosystem understands
 */
function buildPaths(): Paths {
  let paths: { [key: string]: [string] } = {};

  const directoryNames = fs.readdirSync(SOURCE);
  directoryNames.forEach((directoryName: string) => {
    const tsconfigPath = path.join(SOURCE, directoryName, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      paths[directoryName] = [`${SOURCE}/${directoryName}/addon`];
      paths[`${directoryName}/*`] = [`${SOURCE}/${directoryName}/addon/*`];
    }
  });

  // add in global types to the paths field here
  paths['*'] = ['./types/*'];

  return paths;
}

/**
 * Using Microsoft's jsonc-parser, this method finds our tsconfig.base.json file, and patches the
 * `paths` field using the `buildPaths` method above. This way we don't need to manually update the
 * paths every time a new addon is onboarded to TypeScript, and we can verify this is run by adding
 * it to the lint-staged command for anytime a tsconfig.json file is staged to be committed.
 */
function patchBaseTSConfig(): void {
  const edits = jsoncParser.modify(
    BASE_TS_CONFIG.toString(),
    ['compilerOptions', 'paths'],
    buildPaths(),
    {}
  );

  const patchedTSConfig = jsoncParser.applyEdits(
    BASE_TS_CONFIG.toString(),
    edits
  );
  fs.writeFile(BASE_TS_CONFIG_PATH, patchedTSConfig, 'utf8', (err) => {
    if (err) {
      console.log(err);
    }
  });
}

patchBaseTSConfig();
