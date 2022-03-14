import { assert } from 'chai';
import { describe } from 'mocha';

import { Reporter } from '@rehearsal/reporter';

import { realPluginParams } from './utils';
import pluginTSMigrateAutofix from '../src/plugin-ts-migrate-autofix';

describe('Test pluginTSMigrateAutofix', function () {
  it(`run`, async () => {
    const input = `
      // @ts-expect-error ts-migrate(6133) FIXME: The declaration '{0}' is never read. Remove the declaration or use it.
      function oopsOne(variable: string) { }
      // @ts-expect-error ts-migrate(6133) FIXME: The declaration '{0}' is never read. Remove the declaration or use it.
      function oopsTwo(variable: string) { }
      `;

    const params = await realPluginParams({
      text: input,
      options: {
        reporter: new Reporter(),
      },
    });

    const output = await pluginTSMigrateAutofix.run(params);

    const expected = `
      // @ts-expect-error ts-migrate(6133) FIXED: The declaration '{0}' is never read. Remove the declaration or use it.
      function oopsOne(variable: string) { }
      // @ts-expect-error ts-migrate(6133) FIXED: The declaration '{0}' is never read. Remove the declaration or use it.
      function oopsTwo(variable: string) { }
      `;

    assert.equal(output, expected);
  });
});
