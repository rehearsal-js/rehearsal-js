import commander from 'commander';
import winston from 'winston';

import { parse, resolve } from 'path';

import { upgrade } from '.';

type UpgradeCommandOptions = {
  config: string;
  report: string;
  verbose: boolean | undefined;
};

commander.program
  .name('upgrade')
  .description('Compiles TypeScript project and provides diagnostic reports and comments.')
  .argument('basePath', 'Path to the source directory.', parseBasePath)
  .option('-c, --config <name>', 'Name of the tsconfig file.', parseFileName, 'tsconfig.json')
  .option('-r, --report <name>', 'Report file name.', parseFileName, '.rehearsal-diagnostics.json')
  .option('-m, --modify', 'Add diagnostic @ts-ignore comments to source files')
  .option('-v, --verbose', 'Display diagnostic progress')
  .action(async (basePath: string, options: UpgradeCommandOptions) => {
    const logger = createLogger(!options.verbose);
    await upgrade({
      basePath: basePath,
      configName: options.config,
      logger: logger,
    })
      .then(() => {
        logger?.info('Done');
      })
      .catch((reason) => logger?.error(`\nUpgrade failed!\n${reason.toString()}`));
  })
  .parse(process.argv);

function createLogger(silent: boolean): winston.Logger | undefined {
  return winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.cli(),
        silent: silent,
      }),
    ],
  });
}
/**
 * Parses input string and returns full base path
 */
function parseBasePath(value: string): string {
  return resolve(value);
}

/**
 * Parses input string and returns only file name
 */
function parseFileName(value: string): string {
  return parse(value).base;
}
