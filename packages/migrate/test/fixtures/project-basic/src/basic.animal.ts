import { Food } from './basic.food';

export class Animal {
  say(message: string): string {
    return message;
  }

  feed(food: Food, quantity: number): boolean {
    console.log(food, quantity);
    return false;
  }
}
