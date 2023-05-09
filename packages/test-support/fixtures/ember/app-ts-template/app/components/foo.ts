import Component from '@ember/component';

export default class Foo extends Component {
  name = 'FOO';

  obj = { a: 'A', b: 'B', c: 1, 𝚪: '' };

  MaybeComponent;
}
