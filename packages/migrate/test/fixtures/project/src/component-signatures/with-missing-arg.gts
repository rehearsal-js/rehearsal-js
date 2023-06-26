import Component from '@glimmer/component';

export interface WithMissingArgComponentSignature {
  Args: {}
}

export default class WithMissingArg extends Component<WithMissingArgComponentSignature> {
  name = 'Bob';

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}
