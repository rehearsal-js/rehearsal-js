class Animal {
  say(message: string): string {
    console.log(message);
    return 'hello';
  }
}

class Dog extends Animal {
  say(message) {
    console.log(message);
    return 'bar';
  }
}

class Cat extends Animal {
  override say(message) {
    console.log(message);
    return 'bar';
  }
}
