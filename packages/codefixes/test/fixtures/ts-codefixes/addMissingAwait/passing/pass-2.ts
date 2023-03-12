async function fn(a: string, b: Promise<string>) {
  const x = await b;
  fn(x, b);
  fn(await b, b);
}
