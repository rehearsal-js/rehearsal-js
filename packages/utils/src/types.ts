import type { TsConfigJson } from 'type-fest';

export interface GitDescribe {
  tag: string;
  count: number;
  sha: string;
  dirty: boolean;
}

export interface TSConfig extends TsConfigJson {
  glint?: {
    environment?: string[];
    checkStandaloneTemplates?: boolean;
  };
}

export type TSConfigBase = {
  compilerOptions: {
    strict: boolean;
    skipLibCheck: boolean;
  };
};

export type TSConfigEmber = TSConfigBase & {
  glint: {
    environment: string[];
    checkStandaloneTemplates: boolean;
  };
};

export type TSConfigGlimmer = TSConfigBase & {
  glint: {
    environment: string[];
    checkStandaloneTemplates: boolean;
  };
};
