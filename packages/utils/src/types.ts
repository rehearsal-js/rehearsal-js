import type { TsConfigJson } from 'type-fest';

export interface TSConfig extends TsConfigJson {
  glint?: {
    environment: string | Array<string> | Record<string, unknown>;
    checkStandaloneTemplates?: boolean;
  };
}
