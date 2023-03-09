import { resolve } from 'node:path';
import { addDep } from '@rehearsal/utils';
import { execa } from 'execa';
import { readJSONSync } from 'fs-extra/esm';
import type {
  MigrateCommandConfig,
  UpgradeCommandConfig,
  CliCommand,
  CustomConfig,
} from './types.js';

// Storage and runner for user custom cli config
export class UserConfig {
  public basePath: string;
  public config?: MigrateCommandConfig | UpgradeCommandConfig;

  constructor(basePath: string, command: CliCommand) {
    const config: CustomConfig = readJSONSync(resolve(basePath, 'rehearsal-config.json'));

    this.config = config[command];

    this.basePath = basePath;
  }

  public get hasDependencies(): boolean {
    return (
      !!this.config?.install &&
      (!!this.config?.install?.dependencies || !!this.config?.install?.devDependencies)
    );
  }

  public get dependencies(): string[] {
    if (this.config && this.config.install) {
      const { dependencies } = this.config.install;
      if (dependencies && dependencies.length) {
        return dependencies;
      }
    }
    return [];
  }

  public get devDependencies(): string[] {
    if (this.config && this.config.install) {
      const { devDependencies } = this.config.install;
      if (devDependencies && devDependencies.length) {
        return devDependencies;
      }
    }
    return [];
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
      if (Array.isArray(this.config.postInstall)) {
        for (const { command, args } of this.config.postInstall) {
          await execa(command, args, { cwd: this.basePath });
        }
      } else {
        const { command, args } = this.config.postInstall;
        await execa(command, args, { cwd: this.basePath });
      }
    }
  }

  // TODO: how to make setup tasks more generic instead of separated functions?

  // TODO: it doesn't make sense for migrate and upgrade sharing the same setup tasks,
  // What does upgrade command need for custom config?
  async tsSetup(): Promise<void> {
    if (this.config?.setup?.ts) {
      const { ts: tsSetup } = this.config.setup;
      if (Array.isArray(tsSetup)) {
        for (const { command, args } of tsSetup) {
          await execa(command, args, { cwd: this.basePath });
        }
      } else {
        const { command, args } = tsSetup;
        await execa(command, args, { cwd: this.basePath });
      }
    }
  }

  async postTsSetup(): Promise<void> {
    if (this.config?.setup?.postTsSetup) {
      const { postTsSetup } = this.config.setup;
      if (Array.isArray(postTsSetup)) {
        for (const { command, args } of postTsSetup) {
          await execa(command, args, { cwd: this.basePath });
        }
      } else {
        const { command, args } = postTsSetup;
        await execa(command, args, { cwd: this.basePath });
      }
    }
  }

  async lintSetup(): Promise<void> {
    if (this.config?.setup?.lint) {
      const { lint: lintSetup } = this.config.setup;
      if (Array.isArray(lintSetup)) {
        for (const { command, args } of lintSetup) {
          await execa(command, args, { cwd: this.basePath });
        }
      } else {
        const { command, args } = lintSetup;
        await execa(command, args, { cwd: this.basePath });
      }
    }
  }

  async postLintSetup(): Promise<void> {
    if (this.config?.setup?.postLintSetup) {
      const { postLintSetup } = this.config.setup;
      if (Array.isArray(postLintSetup)) {
        for (const { command, args } of postLintSetup) {
          await execa(command, args, { cwd: this.basePath });
        }
      } else {
        const { command, args } = postLintSetup;
        await execa(command, args, { cwd: this.basePath });
      }
    }
  }

  get exclude(): string[] | undefined {
    return (this.config as MigrateCommandConfig)?.exclude;
  }

  get include(): string[] | undefined {
    return (this.config as MigrateCommandConfig)?.include;
  }
}
