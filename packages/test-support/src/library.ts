import fixturify from 'fixturify';
import { Project } from 'fixturify-project';
import { dirSync, setGracefulCleanup } from 'tmp';
import { setupProject } from './project.js';

setGracefulCleanup();

export function create(files: fixturify.DirJSON): string {
  // TODO refactor this test fixture to use fixturify-project
  const { name: tmpdir } = dirSync();
  fixturify.writeSync(tmpdir, files);
  return tmpdir;
}

type FixtureDir = string;

type LibraryVariants =
  | 'simple'
  | 'library-with-tests'
  | 'library-with-ignored-files'
  | 'library-with-css-imports'
  | 'library-with-entrypoint'
  | 'library-with-loose-files'
  | 'library-with-workspaces'
  | 'workspace-with-package-scope-issue';

const DIRS_TO_IGNORE = ['.yarn', 'dist'];

const FILES_TO_IGNORE = [
  '.babelrc.js',
  '.babelrc.json',
  '.babelrc.cjs',
  '.babelrc.mjs',
  'babel.config.js',
  'babel.config.json',
  'babel.config.cjs',
  'babel.config.mjs',
  'Brocfile.js',
  '.eslintrc.js',
  'package-lock.json',
  'yarn.lock',
  'npm-shrinkwrap.json',
  'webpack.config.js',
  '.prettierrc.js',
  '.prettierrc.cjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'karma.config.js',
  'yarn.lock',
];

function getIgnoredFilesFixture(): fixturify.DirJSON {
  const fixtureDir: fixturify.DirJSON = {};

  FILES_TO_IGNORE.forEach((filename) => {
    fixtureDir[filename] = '';
  });

  return fixtureDir;
}

function getIgnoredDirectoriesFixture(): fixturify.DirJSON {
  const fixtureDir: fixturify.DirJSON = {};

  DIRS_TO_IGNORE.forEach((dirname) => {
    fixtureDir[dirname] = { 'should-not-include.js': '// Should not be included' };
  });

  return fixtureDir;
}

export function getFiles(variant: LibraryVariants): fixturify.DirJSON {
  let files: fixturify.DirJSON;

  switch (variant) {
    case 'simple':
      files = {
        'index.js': `
          import * as parser from '@babel/parser';
          import chalk from 'chalk';
          import path from 'path';
          import './lib/a';

          console.log(path.join('foo', 'bar', 'baz'));
          console.log(parser, chalk);
        `,
        'package.json': `
          {
            "name": "my-package",
            "main": "index.js",
            "dependencies": {
              "@babel/parser": "*",
              "chalk": "*"
            },
            "devDependencies": {
              "typescript": "^4.8.3"
            }
          }
        `,
        lib: {
          'a.js': `
            // a.js
            console.log('foo');
           `,
        },
      };
      break;
    case 'library-with-tests':
      files = {
        'index.js': `
            import * as parser from '@babel/parser';
            import chalk from 'chalk';
            import path from 'path';
            import './lib/a';

            console.log(path.join('foo', 'bar', 'baz'));
            console.log(parser, chalk);
          `,
        'package.json': `
            {
              "name": "my-package",
              "main": "index.js",
              "dependencies": {
                "@babel/parser": "*",
                "chalk": "*"
              },
              "devDependencies": {
                "typescript": "^4.8.3"
              }
            }
          `,
        lib: {
          'a.js': `
              // a.js
              console.log('foo');
             `,
        },
        test: {
          'sample.test.js': 'import "../index"',
        },
      };
      break;
    case 'library-with-ignored-files':
      files = {
        'index.js': `
          import './lib/a';
          console.log(path.join('foo', 'bar', 'baz'));
          console.log(parser, chalk);
        `,
        ...getIgnoredFilesFixture(),
        ...getIgnoredDirectoriesFixture(),
        'package.json': `
          {
            "name": "my-package",
            "main": "index.js",
            "dependencies": {
            },
            "devDependencies": {
              "typescript": "^4.8.3"
            }
          }
        `,
        lib: {
          'a.js': '',
        },
        test: {
          'sample.test.js': 'import "../index"',
        },
      };
      break;
    case 'library-with-loose-files':
      files = {
        'WidgetManager.js': `
          import './Widget';
          import './Events'
        `,
        'package.json': `
          {
            "name": "my-package-with-loose-files",
            "main": "index.js",
            "files": [
              "*.js",
              "*.lock",
              "utils/**/*",
              "dist/**/*"
            ],
            "dependencies": {
            },
            "devDependencies": {
              "typescript": "^4.8.3"
            }

          }
        `,
        'Events.js': '',
        'State.js': `import './utils/Defaults';`,
        'Widget.js': `import './State';`,
        utils: {
          'Defaults.js': ``,
        },
        dist: {
          'ignore-this.js': '',
        },
      };
      break;
    case 'library-with-css-imports':
      files = {
        'index.js': `
          import './lib/a';
          import './styles/main.css';
        `,
        'package.json': `
          {
            "name": "my-package",
            "main": "index.js",
            "dependencies": {
            },
            "devDependencies": {
            }
          }
        `,
        lib: {
          'a.js': `
            // a.js
            console.log('foo');
           `,
        },
        styles: {
          'main.css': `.main { color: "black"}`,
        },
      };
      break;
    case 'library-with-workspaces':
      files = {
        packages: {
          foo: {
            'package.json': `{
              "name": "@something/foo",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/bar": "*"
              }
            }`,
            'index.js': `
              import './lib/a';
            `,
            lib: {
              'a.js': `
              // a.js
              console.log('foo');
             `,
            },
          },
          bar: {
            'package.json': `{
              "name": "@something/bar",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/baz": "*"
              },
              "devDependencies": {
                "@something/blorp": "*"
              }
            }`,
          },
          baz: {
            'package.json': `{
              "name": "@something/baz",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
              }
            }`,
          },
          blorp: {
            'package.json': `{
              "name": "@something/blorp",
              "version": "1.0.0",
              "main": "index.js"
            }`,
            'build.js': `import '../../some-shared-util';`,
            'index.js': `
              import './lib/impl';
            `,
            lib: {
              'impl.js': `
                // impl.js
              `,
            },
          },
        },
        'package.json': `
          {
            "name": "some-library-with-workspace",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT",
            "workspaces": [
              "packages/*"
            ]
          }
        `,
        'some-util.js': '// Some useful util file shared across packages.',
      };
      break;
    case 'library-with-entrypoint':
      files = {
        'foo.js': `
          export function say(name = 'World') {
            return \`Hello \${name}\`;
          }
        `,
        'depends-on-foo.js': `
          import { say } from './foo';

          console.log(say('hello'));
        `,
        'index.js': `
          import path from 'path';

          export function power(foo, bar) {
            return Math.pow(foo, bar);
          }
        `,
        'package.json': `
          {
            "name": "basic",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT"
          }
        `,
      };
      break;
    case 'workspace-with-package-scope-issue':
      files = {
        packages: {
          branch: {
            'package.json': `{
              "name": "@some-workspace/branch",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@some-workspace/leaf": "*"
              }
            }`,
            'index.js': `
              import { do } from '@some-workspace/leaf';
              import './lib/a';
            `,
            'build.js': `import '../../some-shared-util';`,
            lib: {
              'a.js': `
              // a.js
              console.log('foo');
             `,
            },
          },
          leaf: {
            'package.json': `{
              "name": "@some-workspace/leaf",
              "version": "1.0.0",
              "main": "index.js"
            }`,
            'index.js': `
              import './lib/impl';
              export function do() { console.log(''); }
            `,
            'build.js': `import '../../some-shared-util';`,
            lib: {
              'impl.js': `
                // impl.js
              `,
            },
          },
        },
        'some-shared-util.js': '// something-shared',
        'package.json': `
          {
            "name": "root-package",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT",
            "workspaces": [
              "packages/*"
            ]
          }
        `,
      };
      break;
    default:
      throw new Error('Unable to getFiles; Invalid variant;');
  }

  return files;
}

export function getLibrary(variant: LibraryVariants): FixtureDir {
  return create(getFiles(variant));
}

export function getLibraryProject(variant: LibraryVariants): Project {
  const project = new Project(variant);
  project.files = getFiles(variant); // Explicitly set files, if passed in Project constructor a index.js is stubbed out.
  return project;
}

export async function getLibraryProjectFixture(variant: LibraryVariants): Promise<Project> {
  return setupProject(getLibraryProject(variant));
}
