'use strict';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import { getFileWithExt } from '@util/utils';
import { createThumbnail } from './videoThumbnail.js';

const main = async () => {
  try {
    const arg = minimist(process.argv.slice(2));
    const { ext, limit, row, col, width } = arg;

    const [folder] = arg._;

    if (!folder || !fs.existsSync(folder)) {
      throw Error(`Invalid folder path, receive: ${folder}`);
    }

    console.log('start generating video thumbnail ...');

    const extension = ext
      ? Array.isArray(ext)
        ? ext.map((t: string) => `.${t}`)
        : [`.${ext}`]
      : ['.mp4'];

    const videos = getFileWithExt(folder, extension);

    for (const v of videos) {
      try {
        const vPath = path.join(folder, v);
        await createThumbnail(vPath, {
          limit,
          width: width || 2048,
          row: row || 4,
          col: col || 4,
        });
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log('done');
  }
};

main();
