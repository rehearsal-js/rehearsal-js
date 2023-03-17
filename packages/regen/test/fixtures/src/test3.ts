function add(foo: number, bar: number): number {
  return foo + bar;
}

/* @ts-expect-error @rehearsal TODO TS2345: Argument of type 'string' is not assignable to parameter of type 'number'. Consider verifying both types, using type assertion: '("5" as string)', or using type guard: 'if ("5" instanceof string) { ... }'. */
add("5", 10);

/* @ts-expect-error @rehearsal TODO TS6133: The variable 'baz' is never read or used. Remove the variable or use it. */
const baz = "";
