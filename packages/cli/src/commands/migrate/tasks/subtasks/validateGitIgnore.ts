import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { CommandContext } from '../../../../types.js';

export async function validateGitIgnore(context: CommandContext): Promise<void> {
  const gitignorePath = resolve(context.input.basePath, '.gitignore');

  if (!existsSync(gitignorePath)) {
    return;
  }

  const gitignore = readFileSync(gitignorePath, 'utf-8');
  const rehearsalRegex = /\.rehearsal.*/g;

  if (rehearsalRegex.test(gitignore)) {
    throw new Error(
      `.rehearsal directory is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
  }

  return;
}
