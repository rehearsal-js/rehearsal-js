Notes:
What is the target type release for ember somehwere between 4.5 ~ 4.7

When a migrating an app or source, prioritize `@types` for now `3.28`. Then in
higher ember Somewhere between 4.5 ~ 4.7

Tasks:

- [x] Create test-packages directory with examples ember apps.
- [ ] What does `generate-tsconfig.paths.ts` ?
- [ ] Move gernate-tsconfig-paths logic for ember specific packages to `migration-graph-ember`
- [ ] Setup auto ELR on all ember @types/ember\*
- [x] In `entrypoint.ts` ensure that resolution algorithm follows:https://www.typescriptlang.org/docs/handbook/module-resolution.html
