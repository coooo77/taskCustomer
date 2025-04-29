'use strict';

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import promiseFs from 'fs/promises';
import { isEqual } from 'lodash-es';

import {
  clipVideo,
  removeFile,
  getPromptFn,
  combineVideos,
  getFileWithExt,
} from '@util/utils';

interface Clip {
  start: string;
  to: string;
}

interface ClipItem {
  filename: string;
  clips: Clip[];
  noCombine?: boolean;
  keepChunk?: boolean;
}

async function main() {
  const arg = minimist(process.argv.slice(2));
  const { ext, folderPath, exportPath, exportExt = '.mp4', debug } = arg;

  console.log(`arg received:`, arg);

  if (!folderPath || !fs.existsSync(folderPath)) {
    throw Error(`Invalid folder path, receive: ${folderPath}`);
  }

  const extension = ext
    ? Array.isArray(ext)
      ? ext.map((t: string) => `.${t}`)
      : [`.${ext}`]
    : ['.ts', '.mp4', '.webm', '.flv', '.mkv'];

  const videos = getFileWithExt(folderPath, extension);

  const setting: ClipItem[] = videos.map((videoName) => ({
    filename: videoName,
    noCombine: false,
    keepChunk: false,
    clips: [{ start: '', to: '' }],
  }));

  const configFileName = `${Date.now()}-clip-config.json`;
  const configFilePath = path.join(folderPath, configFileName);

  await promiseFs.writeFile(configFilePath, JSON.stringify(setting));

  let confirmSting = '';
  do {
    const confirm = getPromptFn(
      'waiting user to complete ffmpeg settings, enter "yes" to continue ',
    );
    confirmSting = await confirm();
  } while (confirmSting !== 'yes');

  const editSetting = await promiseFs.readFile(configFilePath, 'utf-8');
  const editSettingJson = JSON.parse(editSetting) as ClipItem[];

  if (
    !editSettingJson ||
    !Array.isArray(editSettingJson) ||
    editSettingJson.length === 0
  ) {
    console.warn(
      `no valid config file found, please check the config file: ${configFilePath}`,
    );
    return;
  }

  if (isEqual(setting, editSettingJson)) {
    console.warn(
      `no changes detected in the config file, please check the config file: ${configFilePath}`,
    );
    return;
  }

  const clipItems = editSettingJson.filter((item) => {
    const isValid = item.clips.every((clip) => !!clip.start || !!clip.to);
    if (!isValid) console.warn(`invalid clip item found: ${item.filename}`);
    return isValid;
  });

  for (const clipItem of clipItems) {
    const { filename, clips, noCombine, keepChunk } = clipItem;
    const clipFileFullPath = path.join(folderPath, filename);

    const shouldCombine = clips.length >= 2;
    const combineList: string[] = [];
    try {
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const suffix = shouldCombine
          ? `_${String(i).padStart(3, '0')}`
          : undefined;

        console.log(`start to clip video: ${filename}\r\n`);
        const result = await clipVideo(clipFileFullPath, {
          ...clip,
          debug,
          suffix,
          exportExt,
          exportPath,
        });

        if (result.exportFilePath && shouldCombine)
          combineList.push(result.exportFilePath);
      }
    } catch (error) {
      console.error(error);
    }

    if (!shouldCombine || noCombine) continue;

    if (combineList.length !== clips.length) {
      console.warn(
        `fail to combine videos: ${filename} due to incorrect number of videos, expect ${clips.length} but received ${combineList.length}`,
      );

      continue;
    }

    try {
      console.log(`start to combined videos: ${filename}\r\n`);
      if (debug) console.log(`files received:`, combineList);
      await combineVideos(combineList, {
        debug,
        exportExt,
        exportPath,
        exportFileName: filename,
      });
    } catch (error) {
      console.error(error);
    } finally {
      if (!keepChunk) {
        const mutex = Promise.resolve();

        for (const file of combineList) {
          mutex.then(() => removeFile(file)).catch(console.error);
        }
      }
    }
  }

  if (fs.existsSync(configFilePath)) fs.unlinkSync(configFilePath);
}

main();
