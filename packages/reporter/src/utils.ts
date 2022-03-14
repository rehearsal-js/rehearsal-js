import { readFileSync } from 'fs';
import { parse } from 'json5';

export function readText(file: string): string | undefined {
  return readFile(file, 'utf8');
}

export function readFile(file: string, encoding: 'utf8'): string | undefined;
export function readFile(file: string, encoding?: undefined): Buffer | undefined;
export function readFile(file: string, encoding?: 'utf8'): string | Buffer | undefined {
  try {
    return readFileSync(file, encoding);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw e;
  }
}

export function readJSONString<TJson = unknown>(filepath: string, separator = '\n'): TJson[] {
  const text = readText(filepath) as string;
  const strJSONArray = text.split(separator).filter((a) => a);

  return strJSONArray.map((a) => parse(a));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
