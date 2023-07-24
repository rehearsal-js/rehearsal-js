import Component from "@glimmer/component";

//
// UseCase: Should update type reference with all args
//

interface FooSignature {
  Args: FooArgs;
}

interface FooArgs {}

export class Foo extends Component<FooSignature> {
  <template>
    {{@age}} {{@snack}}
  </template>
}

//
// UseCase: Should add a single arg to the args interface
//

interface BarSignature {
  Args: BarArgs;
}

interface BarArgs {
  age: number;
}

export class SomeComponent extends Component<BarSignature> {
  <template>
    {{@age}} {{@snack}}
  </template>
}

//
// UseCase: Should update object literal
//

export interface BazSignature {
  Args: {};
}

export default class Baz extends Component<BazSignature> {
  <template>
    {{@age}} {{@snack}}
  </template>
}
