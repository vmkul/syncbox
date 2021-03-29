import { beforeEach, describe, expect, test } from '@jest/globals';
import Diff from '../diff';

const setsEqual = (a, b) =>
  a.size === b.size && [...a].every(value => b.has(value));

const oneTwoThreeFile = 'one/two/three/file.txt';
const oneTwoThreeDir = 'one/two/three/dir';
const dirFile = 'dir/file.txt';

describe('Tests for Diff class', () => {
  let diff;

  beforeEach(() => {
    diff = new Diff();
  });

  test('Simple add file', () => {
    diff.addFile('hello.txt');
    expect(diff.filesToAdd.has('hello.txt')).toBe(true);
  });

  test('Simple unlink file', () => {
    diff.addFile('hello.txt');
    diff.addUnlink('hello.txt');
    expect(diff.filesToAdd.has('hello.txt')).toBe(false);
    expect(diff.filesToUnlink.has('hello.txt')).toBe(true);
  });

  test('Simple add dir', () => {
    diff.addDir('dir');
    expect(diff.dirsToAdd.has('dir')).toBe(true);
  });

  test('Simple unlink dir', () => {
    diff.addDir('dir');
    diff.addUnlinkDir('dir');
    expect(diff.dirsToAdd.has('dir')).toBe(false);
    expect(diff.dirsToUnlink.has('dir')).toBe(true);
  });

  test('Adding file ensures file and/or containing dirs are not removed', () => {
    diff.addUnlink(oneTwoThreeFile);
    diff.addUnlinkDir('one/two/three');
    diff.addUnlinkDir('one/two');
    diff.addUnlinkDir('one');
    diff.addFile(oneTwoThreeFile);

    expect(diff.filesToAdd.has(oneTwoThreeFile)).toBe(true);
    expect(diff.filesToUnlink.has(oneTwoThreeFile)).toBe(false);
    expect(diff.dirsToUnlink.size).toBe(0);
  });

  test('Adding dir ensures dir and/or containing dirs are not removed', () => {
    diff.addUnlinkDir(oneTwoThreeDir);
    diff.addUnlinkDir('one/two/three');
    diff.addUnlinkDir('one/two');
    diff.addUnlinkDir('one');
    diff.addDir(oneTwoThreeDir);

    expect(diff.dirsToAdd.has(oneTwoThreeDir)).toBe(true);
    expect(diff.dirsToUnlink.size).toBe(0);
  });

  test('Unlink file is ignored if parent dir is being removed', () => {
    diff.addUnlinkDir('root');
    diff.addUnlink('root/dir/dir1/file.txt');

    expect(diff.dirsToUnlink.has('root')).toBe(true);
    expect(diff.filesToUnlink.size).toBe(0);
  });

  test('Unlink dir is ignored if parent dir is being removed', () => {
    diff.addUnlinkDir('root');
    diff.addUnlinkDir('root/dir');
    diff.addUnlinkDir('root/dir/dir1');
    diff.addUnlinkDir('root/dir/dir1/dir2');

    expect(setsEqual(diff.dirsToUnlink, new Set(['root']))).toBe(true);
  });

  test('Unlink dir ensures files and/or dirs are not added down the hierarchy', () => {
    diff.addFile('root/dir/file.txt');
    diff.addFile('root/dir/one/hello.txt');
    diff.addFile('root/dir/two/three/test.txt');
    diff.addDir('root/dir/dir1');
    diff.addDir('root/dir/dir1/dir2');
    diff.addUnlinkDir('root/dir');

    expect(diff.filesToAdd.size).toBe(0);
    expect(diff.dirsToAdd.size).toBe(0);
    expect(diff.dirsToUnlink.has('root/dir')).toBe(true);
  });

  test('Complex merge test', () => {
    diff.addFile('root/dir/file.txt');
    diff.addFile('root/dir/one/hello.txt');
    diff.addFile('root/dir/two/three/test.txt');
    diff.addDir('dir');
    diff.addDir('dir/dir1');
    diff.addFile('dir/hello.txt');
    diff.addFile(dirFile);

    const otherDiff = new Diff();
    otherDiff.addFile('photo.png');
    otherDiff.addFile('dir/hello.png');
    otherDiff.addUnlinkDir('root/dir');
    otherDiff.addUnlink(dirFile);

    diff.mergeWith(otherDiff);

    expect(
      setsEqual(
        diff.filesToAdd,
        new Set(['dir/hello.txt', 'photo.png', 'dir/hello.png'])
      )
    ).toBe(true);
    expect(setsEqual(diff.filesToUnlink, new Set([dirFile]))).toBe(true);
    expect(setsEqual(diff.dirsToAdd, new Set(['dir', 'dir/dir1']))).toBe(true);
    expect(setsEqual(diff.dirsToUnlink, new Set(['root/dir']))).toBe(true);
  });
});
