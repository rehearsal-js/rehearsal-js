import { migrate, MigrateConfig } from 'ts-migrate-server';
import { pluginTSMigrateAutofix } from '@rehearsal/plugin-ts-migrate';
import { eslintFixPlugin, stripTSIgnorePlugin, tsIgnorePlugin } from 'ts-migrate-plugins';

import type { Reporter } from '@rehearsal/reporter';

export async function tsMigrateAutofix(
  srcDir: string,
  reporter: Reporter,
  transformCode?: boolean
): Promise<number> {
  const config = new MigrateConfig()
    .addPlugin(stripTSIgnorePlugin, {})

    // TODO: Review following plugins and enable them pr remove
    // Errors: 2551
    //.addPlugin(declareMissingClassPropertiesPlugin, {})

    // Errors: 2459, 2525, 2683, 7006, 7008, 7019, 7031, 7034
    //.addPlugin(explicitAnyPlugin, {})

    // Errors: 2571
    //.addPlugin(addConversionsPlugin, {})

    // Run eslint-fix to fix up formatting before running transforms.
    .addPlugin(eslintFixPlugin, {})

    // Adds ts-expect-error() comments above the lines need to be fixed
    .addPlugin(tsIgnorePlugin, { messageLimit: 300 })

    // Run transforms to fix lines marked by tsIgnorePlugin plugin
    .addPlugin(pluginTSMigrateAutofix, {
      updateCommentsOnly: !transformCode,
      reporter: reporter,
    })

    // Run eslint-fix again after to fix up formatting possibly broken by transforms.
    .addPlugin(eslintFixPlugin, {});

  const exitCode = await migrate({ rootDir: srcDir, config });

  return exitCode;
}
