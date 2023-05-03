import type FooService from "foo/services/foo-service";

// @ts-expect-error @rehearsal TODO TS2307: Cannot find module 'services/moo/moo' or its corresponding type declarations.
import type MooService from "services/moo/moo";
import type GooService from "services/goo";
import type BooService from "boo/services/boo-service";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("foo@foo-service")
  declare fooService: FooService;

  @service("boo-service")
  declare booService: BooService;

  @service
  declare gooService: GooService;

  @service
  declare mooService: MooService;

  // Has to be fixes, but no additional import statement added
  @service("boo-service") secondBooService;

  // @ts-expect-error @rehearsal TODO TS7008: Member 'nonQualified' implicitly has an 'any' type.
  @service('non-qualified') nonQualified;

  <template>
    <span>Hello, I am human, and I am 10 years old!</span>
  </template>
}
