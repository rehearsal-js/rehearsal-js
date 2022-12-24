import fixturify from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';

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
  | 'library-with-css-imports'
  | 'library-with-entrypoint'
  | 'library-with-loose-files'
  | 'library-with-workspaces';

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
            'index.js': `
              import './lib/impl';
            `,
            'build.js': `
              import '../../some-util.js';
            `,
            lib: {
              'impl.js': `
                // impl.js
              `,
            },
          },
        },
        'some-util.js': '// Shared file',
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
    default:
      throw new Error('Unable to getFiles; Invalid variant;');
  }

  return files;
}

export function getLibrary(variant: LibraryVariants): FixtureDir {
  return create(getFiles(variant));
}
