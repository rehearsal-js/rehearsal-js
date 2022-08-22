#!/usr/bin/env node

import { Command } from 'commander';
import winston from 'winston';
import { migrate, MigrateInput } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
// import { resolve } from 'path';
import { determineProjectName } from '../utils';
// import { BADRESP } from 'dns';

const migrateCommand = new Command();

type migrateCommandOptions = {
  src_dir: string;
  file: string;
  report_output: string;
  verbose: boolean | undefined;
};

// const DEFAULT_SRC_DIR = __dirname;
const DEFAULT_REPORT_DIR = __dirname;

migrateCommand
  .description('Migrate JS project to TS')
  .option('-s, --src_dir <source directory>', 'typescript source directory')
  .option('-f, --file <source file>', 'typescript source file')
  .option(
    '-r, --report_output <report output dir>',
    'set the directory for the report output',
    DEFAULT_REPORT_DIR
  )
  .option('-v, --verbose', 'print more helper logs to debug')
  .action(async (options: migrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: loggerLevel }),
      ],
    });

    const projectName = (await determineProjectName()) || '';
    const reporter = new Reporter(projectName, options.report_output, logger);

    const sourceFiles: Array<string> = [];
    if (options.file) {
      sourceFiles.push(options.file);
    }

    const input: MigrateInput = {
      basePath: options.src_dir,
      sourceFiles,
      logger,
      reporter,
    };

    await migrate(input);
  });

migrateCommand.parse(process.argv);
