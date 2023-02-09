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

export interface IRehearsalConfig {
  upgrade?: CustomCommandConfig;
  migrate?: CustomCommandConfig;
}

export type CustomConfig = IRehearsalConfig;
