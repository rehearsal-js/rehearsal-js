# package-util

## What is this?

A tool for reading and manipulating packages in a project.

## Usage

Primarily used in other scripts:

```
const {
  getInternalModuleMappings,
} = require('@rehearsal/migration-graph-ember/module-mappings');

const { mappingsByAddonName } = getInternalModuleMappings();
```

## Tests

When running tests, ensure that `process.env.PACKAGE_UTILS_TESTING` is set to
`true`.
