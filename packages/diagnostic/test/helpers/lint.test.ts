import { assert } from 'chai';
import { describe } from 'mocha';
import { resolve } from 'path';

import { lint } from '../../src/helpers/lint';

describe('Test lint helper function', function () {
  it(`lint`, async () => {
    const input = `    
     function test(): string {   const a = 'something';
      const b = 'test';
      
const c = 'test';



    // Yeah! Return something
                return 'done';
}`;

    const output = await lint(input, resolve('.', 'test.ts'));

    const expected = `function test(): string {
  const a = 'something';
  const b = 'test';

  const c = 'test';

  // Yeah! Return something
  return 'done';
}
`;

    assert.equal(expected, output);
  });
});
