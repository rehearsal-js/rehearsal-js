import { assert } from 'chai';
import { describe } from 'mocha';

import { Reporter } from '@rehearsal/reporter';

import { realPluginParams } from './utils';
import tsAutofixPlugin from '../src/ts-autofix-plugin';

describe('Test tsAutofixPlugin', function() {
  it(`run`, async () => {
    const input = `
      function oopsOne(variable: string) { }
      function oopsTwo(variable: string) { }
      `;

    let params = await realPluginParams({
      text: input,
      options: {
        reporter: new Reporter(),
      }
    });

    const output = await tsAutofixPlugin.run(params);

    const expected = `
      function oopsOne(variable: string) { }
      function oopsTwo(variable: string) { }
      `;

    assert.equal(output, expected);
  });
});