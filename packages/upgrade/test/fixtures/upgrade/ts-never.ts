function bar() {
  const emtpy = [];
  thing(emtpy, 'foo');
}

function thing(bar = [], thing) {
  const fiz = [];
  fiz.push(thing);
  baz(fiz);
}

function baz(bar = []) {}
