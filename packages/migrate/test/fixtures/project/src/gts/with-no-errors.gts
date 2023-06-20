import Component from '@glimmer/component';

export default class TestGjsNoErrors extends Component {
  name = 'world';

  <template>
    <span>Hello, I am {{this.name}}!</span>
  </template>
}
