export function f<T extends `${number}`>(x: T) {
  const y: `${number}` = x;
  y;
}
