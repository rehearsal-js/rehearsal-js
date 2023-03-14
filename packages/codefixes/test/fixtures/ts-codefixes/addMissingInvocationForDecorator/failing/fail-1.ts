declare function foo(): (...args: any[]) => void;
export class C {
  @foo
  bar() {}
}
