import Component, { hbs } from '@glimmerx/component';

export default class HelloWorld extends Component {
  name = 'world';

  static template = hbs`
  <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
`;
}
