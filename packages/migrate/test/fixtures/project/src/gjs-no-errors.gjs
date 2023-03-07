import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    <span>Hello, I am {{this.name}}!</span>
  </template>
}
