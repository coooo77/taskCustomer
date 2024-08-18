'use strict';
import fs from 'fs';
import path from 'path';
import fsPromise from 'fs/promises';

export function getFileWithExt(dirPath: string, ext: string[]) {
  if (!dirPath) throw Error('dirPath is required.');
  return fs.readdirSync(dirPath).filter((f) => ext.includes(path.extname(f)));
}

export function makeDirIfNotExist(fileLocation?: string) {
  if (!fileLocation) throw new Error(`Invalid file location`);
  if (fs.existsSync(fileLocation)) return fileLocation;
  fs.mkdirSync(fileLocation, { recursive: true });
  return fileLocation;
}

export async function getFileSizeInGB(filePath: string) {
  if (!filePath) throw new Error(`Invalid file path`);

  const stats = await fsPromise.stat(filePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInGB = fileSizeInBytes / (1024 * 1024 * 1024);

  return fileSizeInGB;
}

export function moveFileInSameDisk(
  filename: string,
  fromDir: string,
  toDir: string,
) {
  const from = path.join(fromDir, filename);

  if (!fs.existsSync(from)) {
    console.error(`No file found, name: ${filename}, from: ${fromDir}`);
    return;
  }

  if (!toDir)
    throw Error(
      `destination folder required for moving file: ${filename} from ${fromDir}`,
    );

  const to = path.join(toDir, filename);

  const fromParse = path.parse(from);
  const toParse = path.parse(to);

  if (fromParse.root !== toParse.root)
    throw Error(
      'invalid using function, this function is valid for moving file in same root',
    );

  fs.renameSync(from, to);
}
