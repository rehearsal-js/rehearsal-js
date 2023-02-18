import Component from '@ember/component';
// import { computed } from '@ember/object';

export interface GreetingSignature {
  Args: {
    message: string;
    target?: string;
  };
  Blocks: {
    default: [greeting: string];
  };
}

// We define this type alias so that we can extend it below:
type GreetingArgs = GreetingSignature['Args'];

// This line declares that our component's args will be 'splatted' on to the instance:
export default interface Greeting extends GreetingArgs {}
export default class Greeting extends Component<GreetingSignature> {}