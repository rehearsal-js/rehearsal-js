import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    <span>Hello, {{this.name}}!</span>
  </template>
}
