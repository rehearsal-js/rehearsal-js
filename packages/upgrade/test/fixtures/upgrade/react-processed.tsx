import React from 'react';

export function test() {
  // @rehearsal TODO TS6133: The variable 'unused' is never read or used.
  const unused = 'something';
}

export function Component() {
  // @rehearsal TODO TS2304: Cannot find name 'NonExistingElement'.
  const element1 = <NonExistingElement />;

  const element2 = (
    <h1>
      The Very-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y Long Title
      {/* @rehearsal TODO TS2304: ... */}
      <NonExistingElement>...</NonExistingElement>
      {/* @rehearsal TODO TS2322: ... */}
      <p>{{ $notExistingVariable }}</p>
    </h1>
  );

  console.log(element1, element2);

  // @ts-expect-error @rehearsal TODO TS2304: ...
  return <NonExistingFragment />;
}

export function Test2() {
  const someBoolean = true;

  return someBoolean ? <br doesNotExist="fail" /> : <br />;
}
