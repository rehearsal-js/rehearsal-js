Tasks:

- [x] Create test-packages directory with examples ember apps.
- [ ] What does `generate-tsconfig.paths.ts` ?
- [ ] Setup auto ELR on all ember @types/ember\*
- [x] In `entrypoint.ts` ensure that resolution algorithm follows:https://www.typescriptlang.org/docs/handbook/module-resolution.html
- [ ] Refactor console.log statement to use the Reporter in the repo.

Notes:
What is the target type release for ember somehwere between 4.5 ~ 4.7

When a migrating an app or source, prioritize `@types` for now `3.28`. Then in
higher ember Somewhere between 4.5 ~ 4.7

/\*\*
// milestones
// 1. baseline
// a. fetch internal modules √
// b. setup yargs √
// c. find all the deps:
// 1. dependencies √
// 2. devDependencies √
// 3. ember-addon.paths √
// 4. services
// d. determine if each has been converted to typescript
// 1. has a tsconfig √
// 2. doesn't have any .js files √
// e. output
// 2. tweak input and output
// 3. csv
