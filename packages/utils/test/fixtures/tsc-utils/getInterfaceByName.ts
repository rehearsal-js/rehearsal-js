// @ts-nocheck
interface Person {
  name: string;
  gender: string;
  age: number;
}

interface Student<T extends string> {
  school: T;
  grade: number;
  name: string;
}

interface Pair<K, V> {
  key: K;
  value: V;
}

export interface Car {
  year: number;
  model: string;
  make: string;
}

export interface Collection<T> {
  add(o: T): void;
  remove(o: T): void;
}

export default interface Teacher<T> {
  school: string;
  subject: T;
  yearsOfExperience: number;
}