/*
  啟用條件：telegram 放大置視窗 1
*/
import fs from 'fs';
import path from 'path';
import robot from 'robotjs';
import clipboard from 'clipboardy';

import {
  wait,
  getFileWithExt,
  getFileSizeInGB,
  makeDirIfNotExist,
  moveFileInSameDisk,
} from '@util/utils';

const position = {
  // 上傳迴紋針圖案
  uploadBtn: { x: 709, y: 1007, color: ['fafafa'] },
  // 上傳視窗資料夾位址 input
  choseFileUrl: { x: 597, y: 54, color: ['ffffff'] },
  // 上傳視窗檔案名稱 input
  choseInput: { x: 646, y: 475, color: ['ffffff'] },
  // modal 出現的背景灰
  captionInput: { x: 1636, y: 1016, color: ['808080'] },
};

interface MoveToAndClickOptions {
  preWait?: number;
  midWait?: number;
  postWait?: number;
}

async function moveToAndClick(
  x: number,
  y: number,
  options: MoveToAndClickOptions = {},
) {
  const { preWait, midWait = 500, postWait } = options;

  if (preWait) await wait(preWait);
  robot.moveMouse(x, y);
  await wait(midWait);
  robot.mouseClick('left');
  if (postWait) await wait(postWait);
}

interface PositionInfo {
  x: number;
  y: number;
  color: string[];
}

function checkColor(position: PositionInfo): Promise<void> {
  return new Promise((res, rej) => {
    const { x, y, color } = position;
    const colorPicked = robot.getPixelColor(x, y);

    if (color.includes(colorPicked)) return res();

    const msg = `Invalid color value: ${colorPicked}, expect: ${color}`;
    console.log(msg);
    rej(msg);
  });
}

async function moveToClickAndCheckColor(
  setting: PositionInfo,
  options: MoveToAndClickOptions = {},
) {
  const { x, y } = setting;
  await moveToAndClick(x, y, options);
  await checkColor(setting);
}

async function ctrlV() {
  robot.keyToggle('control', 'down');
  robot.keyTap('v');
  await wait(100);
  robot.keyToggle('control', 'up');
}

async function reTry(callBack: () => Promise<void>, maxTryCount = 0) {
  if (maxTryCount > 4) throw Error('reached max try count');
  try {
    await callBack();
  } catch (error) {
    await wait(100);
    await reTry(callBack, maxTryCount + 1);
  }
}

async function uploadAction(
  videoName: string,
  folderPath: string,
  isInit: boolean,
) {
  const { uploadBtn, choseFileUrl, choseInput, captionInput } = position;

  // 1. click upload btn
  await reTry(() => moveToClickAndCheckColor(uploadBtn, { postWait: 750 }));

  if (isInit) {
    // 2. click choseFileUrl (skip)
    await reTry(() =>
      moveToClickAndCheckColor(choseFileUrl, { postWait: 100 }),
    );

    // 3. paste upload folder url (skip)
    clipboard.writeSync(folderPath);
    await ctrlV();
    robot.keyTap('enter');
  }

  // 4. click choseInput
  await reTry(() => moveToClickAndCheckColor(choseInput));

  // 5. paste file name
  clipboard.writeSync(videoName);
  await ctrlV();
  robot.keyTap('enter');

  // wait caption input
  await reTry(async () => {
    await wait(1000);
    await checkColor(captionInput);
  });

  // paste filename to caption
  await ctrlV();
  robot.keyTap('enter');

  // jobs done
  await wait(1000);
}

function addZero(text: string | number) {
  return String(text).padStart(3, '0');
}

async function main() {
  const folderPath = process.argv.at(-1);
  if (!folderPath || !fs.existsSync(folderPath)) {
    throw Error(`Invalid folder path, receive: ${folderPath}`);
  }

  const videos = getFileWithExt(folderPath, ['.mp4']);

  const filesOver2GBList: string[] = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (!video) {
      console.warn(`no video found: ${video}; index: ${i}`);
      continue;
    }

    console.log(
      `[${addZero(i + 1)}/${addZero(videos.length)}] `,
      'uploading video:',
      video,
    );

    const fileSize = await getFileSizeInGB(path.join(folderPath, video));

    if (fileSize < 2) {
      await uploadAction(video!, folderPath, i === 0);
    } else {
      filesOver2GBList.push(video);
    }
  }

  if (filesOver2GBList.length === 0) return;

  const over2GBFolder = makeDirIfNotExist(
    path.join(folderPath, 'over_2_gb_videos'),
  );

  filesOver2GBList.forEach((f) =>
    moveFileInSameDisk(f, folderPath, over2GBFolder),
  );
}

main();
