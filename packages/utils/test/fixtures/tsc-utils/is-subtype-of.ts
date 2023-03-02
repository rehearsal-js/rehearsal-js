type T1 = { [key: string]: string};
// @ts-ignore
const t1: T1 = { name: 'john' };

type GetValue<T, K extends keyof T> = (obj: T, key: K) => any;
type Age = { age: number };
// @ts-ignore
const getAge: GetValue<Age, 'age'> = (obj: Age, key) => obj[key];
// @ts-ignore
type T2 = string | number;
// @ts-ignore
const t2: T2 = 6;

interface Student {
  name: string;
  id: number;
  year: string;
}

interface Player {
  sport: string;
  position: string;
}
// @ts-ignore
const john: Student & Player = {
  name: 'John',
  id: 1233,
  year: 'freshman',
  sport: 'hockey',
  position: 'forward'
};
