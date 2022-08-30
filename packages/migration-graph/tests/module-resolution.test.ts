import fixturify from 'fixturify';
import path from 'path';
import tmp from 'tmp';
import { describe, test, expect } from 'vitest';
import {
  getMainEntrypoint,
  isDirectoryPackage,
  isModuleNonRelative,
  isModuleRelative,
  resolveRelativeModule,
} from '../src/module-resolution';

tmp.setGracefulCleanup();

describe('module-resolution', () => {
  describe('isModuleNameRelative', () => {
    test('should be true for a relative or absolute path', () => {
      expect(isModuleRelative('./a')).toBe(true);
      expect(isModuleRelative('../a')).toBe(true);
      expect(isModuleRelative('/a')).toBe(true);
    });
    test('should be false for anything else', () => {
      expect(isModuleRelative('chalk')).toBe(false);
      expect(isModuleRelative('@babel/parse')).toBe(false);
    });
  });

  describe('isModuleNonRelative', () => {
    test('should be true if moduleName starts with an ampersand', () => {
      expect(isModuleNonRelative('@babel/parse')).toBe(true);
    });
    test('should be true if moduleName is a package', () => {
      expect(isModuleNonRelative('path')).toBe(true);
    });
  });

  describe('isDirectoryPackage', () => {
    test('should return true if a directory has a package.json', () => {
      const { name: tmpDir } = tmp.dirSync();

      const files = {
        'package.json': '',
      };

      fixturify.writeSync(tmpDir, files);
      expect(isDirectoryPackage(tmpDir)).toBe(true);
    });
    test('should return false if a directory does not have a package.json', () => {
      const { name: tmpDir } = tmp.dirSync();

      const files = {
        'index.js': '',
      };

      fixturify.writeSync(tmpDir, files);
      expect(isDirectoryPackage(tmpDir)).toBe(false);
    });
  });

  describe('getMainEntrypoint', () => {
    test('should use main entry', () => {
      const { name: tmpDir } = tmp.dirSync();

      const packageJson = JSON.stringify({
        main: 'other.js',
      });

      const files = {
        'package.json': packageJson,
        'other.js': '',
      };

      fixturify.writeSync(tmpDir, files);

      const entry = getMainEntrypoint(tmpDir);

      expect(entry).toBe('other.js');
    });
  });

  describe('resolveRelativeModule', () => {
    test('should resolve to main in package.json', () => {
      const { name: tmpDir } = tmp.dirSync();

      const files = {
        foo: {
          'package.json': JSON.stringify({
            main: 'not-obvious.js',
          }),
          'not-obvious.js': ``,
        },
      };

      fixturify.writeSync(tmpDir, files);

      const actual = resolveRelativeModule('./foo', { currentDir: tmpDir });

      expect(actual).toBe(path.join(tmpDir, 'foo/not-obvious.js'));
    });
    test('should resolve to index.js', () => {
      const { name: tmpDir } = tmp.dirSync();

      const files = {
        foo: {
          'index.js': '',
        },
      };

      fixturify.writeSync(tmpDir, files);

      const actual = resolveRelativeModule('./foo', { currentDir: tmpDir });

      expect(actual).toBe(path.join(tmpDir, 'foo/index.js'));
    });

    test('should resolve to index.js', () => {
      const { name: tmpDir } = tmp.dirSync();

      const files = {
        some: {
          'file.js': '',
        },
      };

      fixturify.writeSync(tmpDir, files);

      const actual = resolveRelativeModule('./some/file.js', { currentDir: tmpDir });

      expect(actual).toBe(path.join(tmpDir, 'some/file.js'));
    });

    test('should resolve to index.js', () => {
      const { name: tmpDir } = tmp.dirSync();

      expect(() => resolveRelativeModule('@some/external', { currentDir: tmpDir })).toThrowError(
        '@some/external is external'
      );
    });

    test('should resolve to index.js', () => {
      const { name: tmpDir } = tmp.dirSync();

      expect(() => resolveRelativeModule('path', { currentDir: tmpDir })).toThrowError(
        'path is external'
      );
    });

    test('should resolve to index.js', () => {
      const { name: tmpDir } = tmp.dirSync();

      expect(() => resolveRelativeModule('./does-not-exist', { currentDir: tmpDir })).toThrowError(
        'Unable to resolve non-relative path for ./does-not-exist'
      );
    });
  });
});
