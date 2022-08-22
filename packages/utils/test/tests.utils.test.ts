import { afterEach, describe, expect, test } from 'vitest';
import { resolve } from 'path';

import { createFixturesFromTemplateFiles, cleanFixturesFiles } from '../src';
import fs from 'fs';

describe('Test test utils', () => {
  const path = resolve(__dirname, 'fixtures', 'tests');

  afterEach(() => {
    const tempFiles = ['file1.ts', 'file2.tsx', 'file3.html', 'file4.txt', 'file5.md', 'file6.md'];
    for (const file of tempFiles) {
      fs.rmSync(resolve(path, file), { force: true });
    }
  });

  test('createFixturesFromTemplateFiles: `.input` extension', () => {
    createFixturesFromTemplateFiles(path, path);

    const resultsFiles = fs.readdirSync(path);

    expect(resultsFiles).toContain('file1.ts');
    expect(resultsFiles).toContain('file2.tsx');

    expect(resultsFiles).not.toContain('file3.html');
  });

  test('createFixturesFromTemplateFiles: `.template` extension', () => {
    createFixturesFromTemplateFiles(path, path, '.template');

    const resultsFiles = fs.readdirSync(path);

    expect(resultsFiles).toContain('file3.html');

    expect(resultsFiles).not.toContain('file1.ts');
    expect(resultsFiles).not.toContain('file2.tsx');
  });

  test('cleanFixturesFiles: `.output` extension, now additional files', () => {
    fs.copyFileSync(resolve(path, 'file4.txt.output'), resolve(path, 'file4.txt'));
    fs.copyFileSync(resolve(path, 'file5.md.expected'), resolve(path, 'file5.md'));

    const cleanedFiles = cleanFixturesFiles(path, path);

    expect(cleanedFiles).toContain('file4.txt');
    expect(fs.existsSync(resolve(path, 'file4.txt'))).toBeFalsy();

    expect(cleanedFiles).not.toContain('file5.md');
    expect(fs.existsSync(resolve(path, 'file5.md'))).toBeTruthy();
  });

  test('cleanFixturesFiles: `.expected` extension, now additional files', () => {
    fs.copyFileSync(resolve(path, 'file4.txt.output'), resolve(path, 'file4.txt'));
    fs.copyFileSync(resolve(path, 'file5.md.expected'), resolve(path, 'file5.md'));

    const cleanedFiles = cleanFixturesFiles(path, path, [], '.expected');

    expect(cleanedFiles).toContain('file5.md');
    expect(fs.existsSync(resolve(path, 'file5.md'))).toBeFalsy();

    expect(cleanedFiles).not.toContain('file4.txt');
    expect(fs.existsSync(resolve(path, 'file4.txt'))).toBeTruthy();
  });

  test('cleanFixturesFiles: `.output` extension, with additional files', () => {
    fs.copyFileSync(resolve(path, 'file4.txt.output'), resolve(path, 'file4.txt'));
    fs.copyFileSync(resolve(path, 'file5.md.expected'), resolve(path, 'file5.md'));
    fs.copyFileSync(resolve(path, 'file6.md.tmp'), resolve(path, 'file6.md'));

    const cleanedFiles = cleanFixturesFiles(path, path, ['file6.md']);

    expect(cleanedFiles).toContain('file4.txt');
    expect(fs.existsSync(resolve(path, 'file4.txt'))).toBeFalsy();

    expect(cleanedFiles).not.toContain('file5.md');
    expect(fs.existsSync(resolve(path, 'file5.md'))).toBeTruthy();

    expect(cleanedFiles).toContain('file6.md');
    expect(fs.existsSync(resolve(path, 'file6.md'))).toBeFalsy();
  });
});
