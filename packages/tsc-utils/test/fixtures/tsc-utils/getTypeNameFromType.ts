// @ts-nocheck
import T4 from './getTypeNameFromType-import';

type T1 = { name: string };
interface T2 extends T1 {
  age: number;
}
type T3<T extends T1> = {
  items: T[];
  usedBy: string;
}

let t: T4 = {};
t = { name: 'myname' };

export interface T5<T extends object> {};

