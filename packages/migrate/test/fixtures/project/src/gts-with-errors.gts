import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
