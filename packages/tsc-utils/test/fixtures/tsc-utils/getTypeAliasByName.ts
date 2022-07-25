// @ts-nocheck
type Car = 'Tesla' | 'Ford' | 'Chevrolet';

type StringOrNumber = string | number;

type StringRepeater = (str: string, times: number) => string;

type List<T> = { elements: T[] };

export type Decrementor = (x: number) => number & { decrement: number };

export type Tree = {
  species: string;
  age: number;
  height: number;
}