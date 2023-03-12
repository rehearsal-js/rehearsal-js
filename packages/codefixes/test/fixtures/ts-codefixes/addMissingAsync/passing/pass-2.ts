interface Stuff {
  b: () => Promise<string>;
}
function foo(): Stuff | Date {
  return { b: async (_) => 'hello' };
}
