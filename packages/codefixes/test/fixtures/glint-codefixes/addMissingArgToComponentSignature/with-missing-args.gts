import Component from '@glimmer/component';

interface SomeComponentSignature {
  Args: {}
}

export default class SomeComponent extends Component<SomeComponentSignature> {
  name = 'Bob';

  <template>
    <span>Hello, I am {{this.name}}, and {{@age}} years old. My favorite snack is {{@snack}}</span>
  </template>
}
