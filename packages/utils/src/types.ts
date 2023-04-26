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
