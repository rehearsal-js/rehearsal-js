import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Types | empty object signature members', function (hooks) {
  setupRenderingTest(hooks);

  test('component invocation', async function (assert) {
    assert.expect(0);
    await render(hbs`
      <this.component />

      {{! @glint-expect-error: shouldn't accept blocks }}
      <this.component></this.component>

      <this.component>
        {{! @glint-expect-error: shouldn't accept blocks }}
        <:named></:named>
      </this.component>

      {{! @glint-expect-error: shouldn't accept args }}
      <this.component
        @foo="hi"
      />
    `);
  });

  test('helper invocation', async function (assert) {
    assert.expect(0);
    await render(hbs`
      {{this.helper}}

      {{! @glint-expect-error: shouldn't accept args }}
      {{this.helper arg='hello'}}
    `);
  });

  test('modifier invocation', async function (assert) {
    assert.expect(0);
    await render(hbs`
      <div {{this.modifier}}></div>

      <div
        {{! @glint-expect-error: shouldn't accept args }}
        {{this.modifier arg='hello'}}
      ></div>
    `);
  });
});
