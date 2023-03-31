import 'qunit-dom';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { module, test } from 'qunit';

module('Integration | Helper | grid-list', function (hooks) {
  setupRenderingTest(hooks);

  test('it sets and changes the columns classes', async function (assert) {
    this.set('styles', 'foo');
    await render(hbs`<ul data-test-el class="{{this.styles}}">foo</ul>`);

    this.set('styles', 'foo');
    assert.dom('[data-test-el]').hasClass('some-class', 'has the border class');

    this.set('styles', 'foo');
    assert.dom('[data-test-el]').hasClass('some-class', 'has the border class');

    this.set('styles', 'foo');
    assert.dom('[data-test-el]').hasClass('some-class', 'has the border class');
  });
});
