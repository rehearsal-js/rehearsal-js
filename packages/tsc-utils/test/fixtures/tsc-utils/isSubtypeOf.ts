//ts-nocheck
type T1 = { [key: string]: string};
const t1: T1 = { name: 'john' };

type GetValue<T, K extends keyof T> = (obj: T, key: K) => any;
type Age = { age: number };
const getAge: GetValue<Age, 'age'> = (obj: Age, key) => obj[key];

type T2 = string | number;
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

const john: Student & Player = {
  name: 'John',
  id: 1233,
  year: 'freshman',
  sport: 'hockey',
  position: 'forward'
};