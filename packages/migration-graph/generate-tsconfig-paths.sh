#!/bin/bash

# run the script to build tsconfig paths
./node_modules/.bin/node dist/generate-tsconfig-paths.ts

# run prettier to fix formatting issues introduced by jsonc-parser
./node_modules/.bin/prettier --write 'tsconfig.base.json'
