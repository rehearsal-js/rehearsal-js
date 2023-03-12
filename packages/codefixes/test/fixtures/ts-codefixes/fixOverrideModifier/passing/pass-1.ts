export class B {
  foo(_v: string) {}
  fooo(_v: string) {}
}

export class D extends B {
  override fooo(_v: string) {}
}
