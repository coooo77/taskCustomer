'use strict';
import fs from 'fs';
import path from 'path';
import { getFileWithExt } from '@util/utils';
import { createThumbnail } from './videoThumbnail.js';

const main = async () => {
  try {
    const folder = process.argv.at(-1);

    if (!folder || !fs.existsSync(folder)) {
      throw Error(`Invalid folder path, receive: ${folder}`);
    }

    console.log('start generating video thumbnail ...');

    const videos = getFileWithExt(folder, ['.mp4']);

    for (const v of videos) {
      const vPath = path.join(folder, v);
      await createThumbnail(vPath, { width: 2048, row: 4, col: 4, limit: 6 });
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log('done');
  }
};

main();
