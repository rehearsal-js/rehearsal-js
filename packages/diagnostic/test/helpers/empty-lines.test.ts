import fs from 'fs';

import { assert } from 'chai';
import { describe } from 'mocha';
import { resolve } from 'path';

import {
  preserveEmptyLines,
  preserveEmptyLinesInFile,
  restoreEmptyLines,
  restoreEmptyLinesInFile,
} from '../../src/helpers/empty-lines';

const basePath = resolve(__dirname, '..', 'fixtures', 'empty-lines');

describe('Test empty-lines helper functions', function () {
  it(`preserveEmptyLines`, async () => {
    const input = `some text
    
    with 

empty lines
    `;

    const output = await preserveEmptyLines(input);

    const expected = `some text
/*:line:*/
    with 
/*:line:*/
empty lines
/*:line:*/`;

    assert.equal(expected, output);
  });

  it(`preserveEmptyLinesInFile`, async () => {
    const path = resolve(basePath, 'lines.ts');

    fs.copyFileSync(resolve(basePath, 'lines.ts.input'), path);

    await preserveEmptyLinesInFile(path);

    const expectedContent = fs.readFileSync(resolve(basePath, 'lines.ts.output')).toString().trim();
    const actualContent = fs.readFileSync(path).toString();

    assert.equal(expectedContent, actualContent);

    fs.rmSync(resolve(basePath, 'lines.ts'));
  });

  it(`restoreEmptyLines`, async () => {
    const input = `some text
/*:line:*/
    with 
/*:line:*/
empty lines
/*:line:*/`;

    const output = await restoreEmptyLines(input);

    const expected = `some text

    with 

empty lines
`;

    assert.equal(expected, output);
  });

  it(`restoreEmptyLinesInFile`, async () => {
    const path = resolve(basePath, 'placeholders.ts');

    fs.copyFileSync(resolve(basePath, 'placeholders.ts.input'), path);

    await restoreEmptyLinesInFile(path);

    const expectedContent = fs.readFileSync(resolve(basePath, 'placeholders.ts.output')).toString();
    const actualContent = fs.readFileSync(path).toString();

    assert.equal(expectedContent, actualContent);

    fs.rmSync(resolve(basePath, 'placeholders.ts'));
  });
});
