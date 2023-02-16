import Component, { hbs } from '@glimmerx/component';

interface TestPageSignature {
  person: {
    firstName: string;
    lastName: string;
  }
}
export default class TestPage extends Component<TestPageSignature> {
  static template = hbs`
    <h1>Hello world</h1>
    <p>{{person.firstName}}</p>
    <p>{{person.lastName}}</p>
    <p>{{person.address}}</p>
  `
}