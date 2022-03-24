declare module 'semver' {
  const semver: {
    valid: (input: string) => boolean;
  };
  export = semver;
}
