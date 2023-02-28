
// Case #1: try ... catch

const test = ['dummy'];

try {
  console.log('success');
} catch (e) {
  console.log((e as Error).message);
/* @ts-expect-error @rehearsal TODO TS18046: 'e' is of type 'unknown'. */
  console.log(e.notErrorMember);

  if ((e as Error).name === 'Test') {
    console.log((e as Error).name);
    console.log((e as Error)  .name);
    console.log((e as Error).  name);
    console.log((e as Error) . name);
  }

  if (test[1] === undefined && (e as Error).name === 'Test') {
    console.log((e as Error).name);
  }
}


// Case #2: not a try catch

function getObject<T>(): T {
  const object = ['dummy'];
  return object as unknown as T;
}

const dummy = getObject();

/* @ts-expect-error @rehearsal TODO TS18046: 'dummy' is of type 'unknown'. */
dummy.key;
