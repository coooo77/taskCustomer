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
  return getFileSize(filePath, 'GB');
}

export async function getFileSize(
  filePath: string,
  unit: 'GB' | 'MB' = 'MB',
): Promise<number> {
  if (!filePath) throw new Error('Invalid file path');

  const stats = await fsPromise.stat(filePath);
  const fileSizeInBytes = stats.size;

  switch (unit) {
    case 'GB':
      return fileSizeInBytes / (1024 * 1024 * 1024);
    case 'MB':
      return fileSizeInBytes / (1024 * 1024);
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

export function getReadableFileSizeString(fileSizeInBytes: number) {
  let i = -1;
  const byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
    fileSizeInBytes = fileSizeInBytes / 1024;
    i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

export function humanReadableToBytes(sizeStr: string) {
  const units = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)([A-Za-z]+)$/);

  if (!match) {
    throw new Error('Invalid size format. Example: "1MB", "2GB", "3TB".');
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  const upperUnit = unit.toUpperCase();

  if (!(upperUnit in units)) {
    throw new Error(
      `Unsupported unit: ${unit}. Supported units are: ${Object.keys(units).join(', ')}`,
    );
  }

  return num * units[upperUnit as keyof typeof units];
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
