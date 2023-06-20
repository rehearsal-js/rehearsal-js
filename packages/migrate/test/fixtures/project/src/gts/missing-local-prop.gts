import Component from '@glimmer/component';

export default class TestMissingLocalPropGts extends Component {
  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
