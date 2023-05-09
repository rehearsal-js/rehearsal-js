import type { TsConfigJson } from 'type-fest';

export interface GitDescribe {
  tag: string;
  count: number;
  sha: string;
  dirty: boolean;
}

export interface TSConfig extends TsConfigJson {
  glint?: {
    environment: string | Array<string> | Record<string, unknown>;
    checkStandaloneTemplates?: boolean;
  };
}

export type PreReqTSConfig = {
  compilerOptions: {
    strict: boolean;
    skipLibCheck: boolean;
  };
  glint?: {
    environment: string;
  };
};
