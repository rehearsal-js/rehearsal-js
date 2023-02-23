import { ComponentLike } from '@glint/template';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Foo: ComponentLike<{ Args: { name: string } }>;
  }
}