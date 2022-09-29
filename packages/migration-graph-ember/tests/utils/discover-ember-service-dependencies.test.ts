import fixturify from 'fixturify';
import { discoverServiceDependencies } from '../../src/utils/discover-ember-service-dependencies';
import tmp from 'tmp';
import { describe, expect, test } from 'vitest';

tmp.setGracefulCleanup();

describe('discoverServiceDependencies', () => {
  test('noop', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        export default class Salutation extends Component {}
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeFalsy;
  });

  test('should throw if found service but no classes found', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export function foo() {
          return "hello";
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);
    expect(() => {
      discoverServiceDependencies(tmpDir, 'component.js');
    }).toThrowError('Unexpected Error: No classes found despite having imported @ember/service.');
  });

  test('should find locale service', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service locale;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    const discovered = results[0];
    expect(discovered.serviceName).toBe('locale');
  });
  test('should work without renaming', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject } from '@ember/service';

        export default class Salutation extends Component {
          @inject locale;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    const discovered = results[0];
    expect(discovered.serviceName).toBe('locale');
  });
  test('should find multiple services', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service locale;
          @service tracking;
          @service request;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(3);
    expect(results[0].serviceName).toBe('locale');
    expect(results[1].serviceName).toBe('tracking');
    expect(results[2].serviceName).toBe('request');
  });
  test('should discover serviceName if renamed', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service('shopping-cart') cart;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0].serviceName).toBe('shopping-cart');
  });
  test('should find service from addon', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service('authentication@authenticated-user') authenticatedUser;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0].addonName).toBe('authentication');
    expect(results[0].serviceName).toBe('authenticated-user');
  });
  test('should find without class on export', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        class Salutation extends Component {
          @service locale;
        }

        export default Salutation;
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const resultss = discoverServiceDependencies(tmpDir, 'component.js');

    expect(resultss).toBeTruthy();
    expect(resultss.length).toBe(1);
    expect(resultss[0].serviceName).toBe('locale');
  });
});
