import { gitIsRepoDirty } from '@rehearsal/utils';
import { reportExisted } from '../validate.js';
import { CommandContext } from '../../../../types.js';

export async function validateUncommittedFiles(
  context: CommandContext,
  task: { output: string }
): Promise<void> {
  const options = context.input;

  if (options.dryRun || options.regen || reportExisted(options.basePath, options.outputPath)) {
    return;
  }

  const hasUncommittedFiles = await gitIsRepoDirty(options.basePath);
  if (hasUncommittedFiles) {
    task.output =
      'You have uncommitted files in your repo. You might want to commit or stash them.';
    //logger.warn('You have uncommitted files in your repo. You might want to commit or stash them.');
  }
}
