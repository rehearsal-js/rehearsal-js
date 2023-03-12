interface Stuff {
  b: () => Promise<string>;
}

function foo(): Stuff | Date {
  return { b: (_) => 'hello' };
}
