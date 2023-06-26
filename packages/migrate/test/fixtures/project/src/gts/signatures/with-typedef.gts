import Component from "@glimmer/component";

//
// UseCase: Should generate a component signature interface
//

export class Repeat extends Component {
  <template>
    <span>{{@phrase}}</span>
  </template>
}

//
// UseCase: Should infer relationship from comment, update heritage clause with signature
//

interface MyComponentSignature {
  Args: {};
}

/**
 * @extends {Component<MyComponentSignature>}
 */
export class MyComponent extends Component {
  name = "Bob";

  <template>
    <Repeat @phrase={{@age}} />
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}

//
// UseCase: Should generate an interface from all comments
//

/**
 * @typedef InterfaceFromCommentSignature
 * @property {InterfaceFromCommentArgs} Args
 */

/**
 * @typedef InterfaceFromCommentArgs
 * @property {number} someArg - some number
 */

/**
 * @extends {Component<InterfaceFromCommentSignature>}
 */
export class Something extends Component {
  <template>
    <span>{{@someArg}}</span>
  </template>
}
