import { Animal } from './basic.animal';

export class Dog extends Animal {
  say(message) {
    console.log(message);
    return 'bar';
  }

  feed(food, quantity) {
    return super.feed(food, quantity);
  }
}
