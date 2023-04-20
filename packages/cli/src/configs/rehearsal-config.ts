export type DependencyConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};

export type HookCommand = {
  command: string;
  args: string[];
};

export type SetupConfig = {
  ts?: HookCommand | HookCommand[];
  postTsSetup?: HookCommand | HookCommand[];
  lint?: HookCommand | HookCommand[];
  postLintSetup?: HookCommand | HookCommand[];
};

export type ValidateConfig = () => Promise<void>;

export type CustomCommandConfig = {
  install?: DependencyConfig;
  postInstall?: HookCommand | HookCommand[];
  setup?: SetupConfig;
};

export type MigrateCommandConfig = CustomCommandConfig & {
  include?: string[];
  exclude?: string[];
};

export type MoveCommandConfig = CustomCommandConfig & {
  exclude?: string[];
};

export type UpgradeCommandConfig = CustomCommandConfig;

export type CommandConfig = UpgradeCommandConfig | MigrateCommandConfig;

export interface IRehearsalConfig {
  migrate?: MigrateCommandConfig;
  upgrade?: UpgradeCommandConfig;
  move?: MoveCommandConfig;
}

export type CustomConfig = IRehearsalConfig;
