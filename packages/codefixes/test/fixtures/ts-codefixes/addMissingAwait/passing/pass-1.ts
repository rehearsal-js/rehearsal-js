export async function fn(a: Promise<() => void>) {
  (await a)();
}
