const foo = async <T>(x: T): Promise<string> => {
  await new Promise((resolve) => resolve(true));
  return '';
};
