interface T10 { field: string; }
// @ts-ignore
type T11 = string | number;
// @ts-ignore
interface T12 extends T10 {
  id: string;
}
// @ts-ignore
interface T13 { id: string; }
// @ts-ignore
type T14 = T10 & T13;

