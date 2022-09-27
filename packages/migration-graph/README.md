# migration-graph

## Developemnt

```
pnpm install
```

## Usage

```
pnpm prepare
cd packages/migration-graph
pnpm link
```

In your package:

```
pnpm link @rehearsal/migration-graph
pnpm migration-graph
// Expect some output
```

Crawls the in-repo dependency graph, including services, for a given package.
Based on the configuration, will output the following for each dependency:
All output options will show the following info for each node in the dependency graph.

- name
- type: addon (A) or service (S), from the perspective of the parent
- isConverted: True/False
  - False if any .js files exist: - if addon, in the /addon directory - if not an addon, in the package root
    Duplicate entries will not be expanded; once a package is reported, only the status of the package will be displayed
    Output Types:
- Recursive Dependency Tree (default no limit)
  - show the status of all the deps starting from a root node
  - Topographic Sorted Tree (default no limit)
  - show the status of all the deps of the root node, in the order they should be converted
    Format Options
- csv
- json
- graphical (not compatible with file option)
  Additional Options
- summary: output total number of deps, breakdown by type, breakdown by status
  includes a message that the depth should be increased or not
- simple: only output the name of the package
- ignore-dupes
- converted
- non-converted
- depth (add a warning that any limit might not find the leafs)
- exclude - comma separate list of globs that match names of packages to ignore (ex. lib/foo-\*)
