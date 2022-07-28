import { Animal, Car } from './2790-import-1';
import { Employee } from './2790-import-2';
import * as RabbitStuff from './2790-import-3';
import Human from './2790-import-4';

const animal: Animal = {
    species: 'dog',
    weight: 90,
};

delete animal.weight;

const car: Car = {
    make: 'Ford',
    model: 'Focus',
    color: 'red',
};

delete car.color;

const employee = new Employee({name: 'Victor', badgeNumber: '12345'});
delete employee.badgeNumber;

const human: Human = {
  weight: 200,
  height: 180,
};
delete human.height;

const rabbit: RabbitStuff.Rabbit = {
  color: 'butterscotch',
  species: 'Holland Lop',
  name: 'Poca',
};
delete rabbit.color;

interface Person {
    name: string;
    age?: number;
    address: string | null;
}

const person:Person = {
    name: 'Jane',
    age: 10,
    address: '123 Happy St'
};

delete person.address;

class Student{
    name: string;
    grade: number;
    gender: string;

    constructor({name, grade, gender}: { name: string; grade: number; gender: string }) {
        this.name = name;
        this.grade = grade;
        this.gender = gender;
    }
}
const student = new Student({name: '', grade: 3, gender: 'male'});
delete student.gender;

type Tree = {
  species: string;
  age: number;
  height: number;
}

const oak: Tree = {
  species: 'oak',
  age: 150,
  height: 40,
};
delete oak.height;