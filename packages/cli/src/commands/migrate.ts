#!/usr/bin/env node

import { Command }  from 'commander';
const program = new Command();

program.parse(process.argv);

console.log('migrate');
