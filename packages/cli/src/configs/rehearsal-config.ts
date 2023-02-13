export type DependencyConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};

export type HookCommand = {
  command: string;
  args: string[];
};

export type SetupConfig = {
  ts?: HookCommand;
  postTsSetup?: HookCommand;
  lint?: HookCommand;
  postLintSetup?: HookCommand;
};

export type ValidateConfig = () => Promise<void>;

export type CustomCommandConfig = {
  install?: DependencyConfig;
  postInstall?: HookCommand;
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
