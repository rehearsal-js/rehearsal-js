interface Stuff {
  b: () => Promise<string>;
}
export function foo(): Stuff {
  return { b: () => 'hello' };
}
