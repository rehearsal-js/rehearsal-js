const foo = <T>(x: T): string => {
  await new Promise((resolve) => resolve(true));
  return '';
};
