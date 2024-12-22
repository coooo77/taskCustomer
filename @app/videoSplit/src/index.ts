'use strict';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import {
  splitVideo,
  getPromptFn,
  getFileWithExt,
  getMediaDuration,
  moveFileInSameDisk,
  humanReadableToBytes,
  padStart0 as ps0,
} from '@util/utils';

function getOrCreateDir(sourceFolder: string, dirName: string) {
  const dirPath = path.join(sourceFolder, dirName);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
  return dirPath;
}

async function throwWithPrompt(msg: string) {
  await getPromptFn(msg)();
  throw Error(msg);
}

async function main() {
  // #region Check params
  const arg = minimist(process.argv.slice(2));
  const { ext, p: folderPath, ...config } = arg;

  console.log(`arg received:`, arg);

  if (!folderPath || !fs.existsSync(folderPath)) {
    throwWithPrompt(`[ERROR] Invalid folder path, receive: ${folderPath}`);
  }

  if (arg?.min && typeof arg.min !== 'string') {
    throwWithPrompt(
      `[ERROR] Invalid min size: ${arg.min}. Example: "1MB", "2GB", "3TB"`,
    );
  }

  if (arg?.divide && typeof arg.divide !== 'string') {
    throwWithPrompt(
      `[ERROR] Invalid divide size: ${arg.min}. Example: "1MB", "2GB", "3TB"`,
    );
  }
  // #endregion

  // #region Initialize
  console.log('start split video');

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

  const minSize = humanReadableToBytes(__CUSTOM_PARAM.min || '1.9GB');
  const splitSize = humanReadableToBytes(__CUSTOM_PARAM.divide || '1.9GB');

  const validVideos = videos.filter((v) => {
    const vPath = path.join(folderPath, v);
    const fileSize = fs.statSync(vPath).size;
    return fileSize >= minSize;
  });

  const exportDirPath = getOrCreateDir(folderPath, 'videos_split');
  const oriDirPath = getOrCreateDir(folderPath, 'videos_split_ori');
  // #endregion

  // #region main process
  for (let i = 0; i < validVideos.length; i++) {
    try {
      const v = validVideos[i];
      const videoPath = path.join(folderPath, v);

      const videoSize = fs.statSync(videoPath).size;
      const numOfSegments = Math.ceil(videoSize / splitSize);

      console.log(
        `[${ps0(i + 1)}/${ps0(validVideos.length)}]: split ${v} into ${numOfSegments}]`,
      );

      const duration = await getMediaDuration(videoPath);
      const durationOfSegment = duration / numOfSegments;

      await splitVideo(videoPath, durationOfSegment, {
        exportPath: exportDirPath,
        debug: global.__CUSTOM_PARAM.debug,
      });

      moveFileInSameDisk(v, folderPath, oriDirPath);
    } catch (error) {
      console.error(error);
    }
  }

  console.log('jobs done');
  // #endregion
}

main();
