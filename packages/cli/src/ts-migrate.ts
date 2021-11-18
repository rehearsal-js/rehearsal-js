import { migrate, MigrateConfig } from "ts-migrate-server";
import { pluginTSMigrateAutofix } from "@rehearsal-js/plugin-ts-migrate";
import type { Reporter } from "@rehearsal-js/reporter";

export type PluginOptions = { reporter: Reporter };

export async function tsMigrateAutofix(
  srcDir: string,
  reporter: Reporter
): Promise<number> {
  const pluginOptions = { reporter };
  const config = new MigrateConfig().addPlugin(
    pluginTSMigrateAutofix,
    pluginOptions
  );
  const exitCode = await migrate({ rootDir: srcDir, config });

  return exitCode;
}
