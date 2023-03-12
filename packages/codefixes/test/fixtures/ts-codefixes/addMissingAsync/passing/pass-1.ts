interface Stuff {
  b: () => Promise<string>;
}
export function foo(): Stuff {
  return { b: async () => 'hello' };
}
