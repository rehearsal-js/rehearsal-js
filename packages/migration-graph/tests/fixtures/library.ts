import fixturify from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';

setGracefulCleanup();

function create(files: fixturify.DirJSON) {
  const { name: tmpdir } = dirSync();
  fixturify.writeSync(tmpdir, files);
  return tmpdir;
}

export function getLibrarySimple(): string {
  const files = {
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
  const dir = create(files);

  return dir;
}

// This is a fixturify version of cli fixtures/app_for_migration/src/basic
export function getLibraryWithEntrypoint() {
  const files = {
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

  const { name: someTmpDir } = dirSync();
  fixturify.writeSync(someTmpDir, files);
  return someTmpDir;
}
