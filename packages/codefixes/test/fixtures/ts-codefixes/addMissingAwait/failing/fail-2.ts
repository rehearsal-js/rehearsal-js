async function fn(a: string, b: Promise<string>) {
  const x = b;
  fn(x, b);
  fn(b, b);
}
