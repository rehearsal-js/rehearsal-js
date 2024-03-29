
// Case #1: try ... catch

const test = ['dummy'];

try {
  console.log('success');
} catch (e) {
  console.log(e.message);
  console.log(e.notErrorMember);

  if (e.name === 'Test') {
    console.log(e.name);
    console.log(e  .name);
    console.log(e.  name);
    console.log(e . name);
  }

  if (test[1] === undefined && e.name === 'Test') {
    console.log(e.name);
  }
}


// Case #2: not a try catch

function getObject<T>(): T {
  const object = ['dummy'];
  return object as unknown as T;
}

const dummy = getObject();

dummy.key;
