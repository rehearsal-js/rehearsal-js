// @ts-nocheck
type Car = {
  model: string;
  year: number;
  color: string;
  make: string;
}

type List<T> = {
  items: T[];
  createdAt: number;
  createdBy: string;
}

export type Student = {
  gender: string;
  year: 'freshman' | 'sophomore' | 'junior' | 'senior';
  major: string;
}