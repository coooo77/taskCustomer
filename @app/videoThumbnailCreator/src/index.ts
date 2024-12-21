'use strict';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import { getFileWithExt, retryFn, padStart0 as ps0 } from '@util/utils';
import { createThumbnail } from './videoThumbnail.js';

const main = async () => {
  try {
    const arg = minimist(process.argv.slice(2));
    const { ext, folderPath, retry, wait: retryDelayInSec, ...config } = arg;

    console.log(`arg received:`, arg);

    if (!folderPath || !fs.existsSync(folderPath)) {
      throw Error(`Invalid folder path, receive: ${folderPath}`);
    }

    console.log('start generating video thumbnail ...');

    const extension = ext
      ? Array.isArray(ext)
        ? ext.map((t: string) => `.${t}`)
        : [`.${ext}`]
      : ['.mp4'];

    global.__CUSTOM_PARAM = {
      ext: extension,
      ...config,
    };

    const videos = getFileWithExt(folderPath, extension);

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      try {
        console.log(`[${ps0(i + 1)}/${ps0(videos.length)}]: check file ${v}`);

        const vPath = path.join(folderPath, v);
        await retryFn(createThumbnail.bind(null, vPath), {
          retryDelayInSec,
          maxRetries: retry,
          name: 'screenshot',
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
