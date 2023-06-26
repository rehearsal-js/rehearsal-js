import Component from "@glimmer/component";

export interface WithMissingArgsSignature {
  Args: {};
}

export default class WithMissingArgs extends Component<WithMissingArgsSignature> {
  name = "Bob";

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}
