import React from 'react';

export function test() {
  const unused = 'something';
}

export function Component() {
  const element1 = <NonExistingElement />;

  const element2 = (
    <h1>
      The Very-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y Long Title
      <NonExistingElement>...</NonExistingElement>
      <p>{{$notExistingVariable}}</p>
    </h1>
  );

  console.log(element1, element2);

  return <NonExistingFragment />;
}

export function Test2() {
  const someBoolean = true;

  return someBoolean ? <br doesNotExist="fail" /> : <br />;
}

