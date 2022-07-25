// @ts-nocheck
import T4, { T5 } from './getTypeNameFromType-import';

const a = 1;
const b = 'string';
const c = undefined;
const d: unknown = 0;
const e: any = 'a';

type Car = {
  make: string;
  model: string;
  year: number;
}

const car: Car = {make: 'Toyota', model: 'Camry', year: 2021 };

const person: { name: string; age: number } = { name: 'Smith', age: 23 };

type List<T> = {
  items: T[];
}

interface Item {
  id: string;
  name: string;
  price: string;
}

const computers: List<Item> = { items: { id: '1234', name: 'laptop', price: 2000 }};

const t4: T4 = {};
const t5: T5 = { name: 'john' };

