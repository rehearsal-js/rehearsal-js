import { resolve } from 'node:path';
import { rmSync, writeFileSync } from 'node:fs';
import { createFileSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import { appScenarios, clean } from '@rehearsal/test-support';
import { Scenario, PreparedApp } from 'scenario-tester';

import { cleanOutput } from '../../test-helpers/index.js';
import { runValidate } from '../../test-helpers/valdiate-test-utils.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: validate', () => {
  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;
      let output = '';

      beforeEach(async () => {
        app = await scenario.prepare();
        clean(app.dir);

        vi.spyOn(console, 'info').mockImplementation((chunk) => {
          output += `${chunk}\n`;
        });
        vi.spyOn(console, 'log').mockImplementation((chunk) => {
          output += `${chunk}\n`;
        });
        vi.spyOn(console, 'error').mockImplementation((chunk) => {
          output += `${chunk}\n`;
        });

        vi.spyOn(logger, 'warn').mockImplementation((chunk) => {
          output += `${chunk}\n`;
          return logger;
        });
        vi.spyOn(logger, 'error').mockImplementation((chunk) => {
          output += `${chunk}\n`;
          return logger;
        });
      });
      afterEach(() => {
        output = '';
        vi.clearAllMocks();
      });

      test('pass with package.json', async () => {
        await runValidate(app.dir, logger);
        expect(cleanOutput(output, app.dir)).toMatchSnapshot();
      });

      test('error if no package.json', async () => {
        rmSync(resolve(app.dir, 'package.json'));
        await expect(() => runValidate(app.dir, logger)).rejects.toThrowError(
          `package.json does not exists`
        );
      });

      test('error if .gitignore has .rehearsal', async () => {
        const gitignore = `.rehearsal\nfoo\nbar`;
        const gitignorePath = resolve(app.dir, '.gitignore');
        writeFileSync(gitignorePath, gitignore, 'utf-8');

        await expect(() => runValidate(app.dir, logger)).rejects.toThrowError(
          `.rehearsal directory is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
        );
      });

      test('show warning message for missing files in --regen', async () => {
        await runValidate(app.dir, logger, { regen: true });
        expect(cleanOutput(output, app.dir)).toMatchSnapshot();
      });

      test('pass with all config files in --regen', async () => {
        createFileSync(resolve(app.dir, '.eslintrc.js'));
        createFileSync(resolve(app.dir, 'tsconfig.json'));

        await runValidate(app.dir, logger, { regen: true });
        expect(cleanOutput(output, app.dir)).toMatchSnapshot();
      });
    });
  });
});
