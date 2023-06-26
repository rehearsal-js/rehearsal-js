import Component from "@glimmer/component";

export interface WithMissingPropertySignature {}

export default class WithMissingProperty extends Component<WithMissingPropertySignature> {
  name = "Bob";

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}
