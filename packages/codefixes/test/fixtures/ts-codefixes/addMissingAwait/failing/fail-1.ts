export async function fn(a: Promise<() => void>) {
  a();
}
