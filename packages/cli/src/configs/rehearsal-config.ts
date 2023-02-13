export type DependencyConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};

export type SetupConfigCommand = {
  command: string;
  args: string[];
};

export type SetupConfig = {
  ts?: SetupConfigCommand;
  lint?: SetupConfigCommand;
};

export type CustomCommandConfig = {
  install?: DependencyConfig;
  setup?: SetupConfig;
};

export type MigrateCommandConfig = CustomCommandConfig & {
  include?: string[];
  exclude?: string[];
};

export type UpgradeCommandConfig = CustomCommandConfig;

export type CommandConfig = UpgradeCommandConfig | MigrateCommandConfig;

export interface IRehearsalConfig {
  upgrade?: UpgradeCommandConfig;
  migrate?: MigrateCommandConfig;
}

export type CustomConfig = IRehearsalConfig;
