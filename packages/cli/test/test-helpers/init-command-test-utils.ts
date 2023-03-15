import { resolve } from 'node:path';
import { readFileSync, readdirSync, promises as fs } from 'node:fs';
import { readJSONSync, writeJSONSync } from 'fs-extra';

import { TSConfig, CustomConfig } from '../../src/types.js';
import { PacakgeJson } from 'type-fest';
import { runBin } from './index.js';

type DefaultRunType = {
  stdout: string;
  devDeps: Record<string, string> | undefined;
  fileList: string[];
  lintConfig: string;
  lintConfigDefault: string;
  tscLintScript: string | undefined;
  tsConfig: TSConfig;
};

type UserConfigRunType = {
  stdout: string;
  devDeps: Record<string, string> | undefined;
  deps: Record<string, string> | undefined;
  tscLintScript: string | undefined;
};

export const CUSTOM_CONFIG = {
  migrate: {
    install: {
      dependencies: ['fs-extra'],
      devDependencies: ['tmp'],
    },
    setup: {
      ts: { command: 'touch', args: ['custom-ts-config-script'] },
      lint: { command: 'touch', args: ['custom-lint-config-script'] },
    },
  },
};

export async function runDefault(basePath: string): Promise<DefaultRunType> {
  const { stdout } = await runBin('migrate', ['init'], {
    cwd: basePath,
  });

  const fileList = readdirSync(basePath);

  const packageJson = JSON.parse(
    JSON.parse(await fs.readFile(resolve(basePath, 'package.json'), 'utf-8'))
  ) as PacakgeJson;

  const devDeps = packageJson.devDependencies;

  const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json')) as TSConfig;
  const lintConfig = readFileSync(resolve(basePath, '.eslintrc.js'), { encoding: 'utf-8' });
  const lintConfigDefault = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), {
    encoding: 'utf-8',
  });

  const tscLintScript = packageJson?.scripts?.['lint:tsc'];

  return {
    stdout,
    devDeps,
    fileList,
    lintConfig,
    lintConfigDefault,
    tsConfig,
    tscLintScript,
  };
}

export async function runWithUserConfig(basePath: string): Promise<UserConfigRunType> {
  const { stdout } = await runBin('migrate', ['init'], {
    cwd: basePath,
  });

  const packageJson = JSON.parse(
    JSON.parse(await fs.readFile(resolve(basePath, 'package.json'), 'utf-8'))
  ) as PacakgeJson;
  const devDeps = packageJson.devDependencies;
  const deps = packageJson.dependencies;

  const tscLintScript = packageJson?.scripts?.['lint:tsc'];

  return {
    stdout,
    devDeps,
    deps,
    tscLintScript,
  };
}

export async function runTwoTimes(basePath: string) {
  await runBin('migrate', ['init'], {
    cwd: basePath,
  });
  const { stdout } = await runBin('migrate', ['init'], {
    cwd: basePath,
  });

  return { stdout };
}

export function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}
