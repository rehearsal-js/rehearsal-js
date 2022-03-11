import { assert } from 'chai';
import { suite } from 'mocha';
import { resolve } from 'path';
import { readJSONString } from '../src/utils';

import type { TSCLog } from '../src';

suite('utils', () => {
  it('readJSONString()', () => {
    const filepath = resolve(__dirname, './fixtures/rehearsal.txt');
    const tscLog = readJSONString<TSCLog>(filepath);
    assert.equal(tscLog[0].autofixedErrors, 0);
    assert.equal(tscLog.length, 19);
  });
});
