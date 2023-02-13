import { resolve } from 'path';
import { addDep } from '@rehearsal/utils';
import execa from 'execa';
import { readJSONSync } from 'fs-extra';
import type { MigrateCommandConfig, UpgradeCommandConfig, CliCommand, CustomConfig } from './types';

// Storage and runner for user custom cli config
export class UserConfig {
  public basePath: string;
  public config?: MigrateCommandConfig | UpgradeCommandConfig;

  constructor(basePath: string, configPath: string, command: CliCommand) {
    const config: CustomConfig = readJSONSync(resolve(basePath, configPath));

    this.config = config[command];

    this.basePath = basePath;
  }

  public get hasDependencies(): boolean {
    return (
      !!this.config?.install &&
      (!!this.config?.install?.dependencies || !!this.config?.install?.devDependencies)
    );
  }

  public get hasPostInstallHook(): boolean {
    return !!this.config?.postInstall;
  }

  public get hasTsSetup(): boolean {
    return !!this.config?.setup?.ts;
  }

  public get hasPostTsSetupHook(): boolean {
    return !!this.config?.setup?.postTsSetup;
  }

  public get hasLintSetup(): boolean {
    return !!this.config?.setup?.lint;
  }

  public get hasPostLintSetup(): boolean {
    return !!this.config?.setup?.postLintSetup;
  }

  async install(): Promise<void> {
    if (this.config && this.config.install) {
      const { dependencies, devDependencies } = this.config.install;
      if (dependencies && dependencies.length) {
        await addDep(dependencies, false, { cwd: this.basePath });
      }

      if (devDependencies && devDependencies.length) {
        await addDep(devDependencies, true, { cwd: this.basePath });
      }
    }
  }

  async postInstall(): Promise<void> {
    if (this.config && this.config.postInstall) {
      const { command, args } = this.config.postInstall;
      await execa(command, args, { cwd: this.basePath });
    }
  }

  // TODO: how to make setup tasks more generic instead of separated functions?

  // TODO: it doesn't make sense for migrate and upgrade sharing the same setup tasks,
  // What does upgrade command need for custom config?
  async tsSetup(): Promise<void> {
    if (this.config?.setup?.ts) {
      const { command, args } = this.config.setup.ts;
      await execa(command, args, { cwd: this.basePath });
    }
  }

  async postTsSetup(): Promise<void> {
    if (this.config?.setup?.postTsSetup) {
      const { command, args } = this.config.setup.postTsSetup;
      await execa(command, args, { cwd: this.basePath });
    }
  }

  async lintSetup(): Promise<void> {
    if (this.config?.setup?.lint) {
      const { command, args } = this.config.setup.lint;
      await execa(command, args, { cwd: this.basePath });
    }
  }

  async postLintSetup(): Promise<void> {
    if (this.config?.setup?.postLintSetup) {
      const { command, args } = this.config.setup.postLintSetup;
      await execa(command, args, { cwd: this.basePath });
    }
  }

  get exclude(): string[] | undefined {
    return (this.config as MigrateCommandConfig)?.exclude;
  }

  get include(): string[] | undefined {
    return (this.config as MigrateCommandConfig)?.include;
  }
}
