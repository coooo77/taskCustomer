'use strict';
import fs from 'fs';
import path from 'path';

import {
  getPromptFn,
  secondsToHMS,
  getFileWithExt,
  getMediaDuration,
} from '@util/utils';

interface Detail {
  count: number;
  duration: number;
}

const rootPath = 'D:/record_tools/readyForUploading/uploading';
const combineCheckDir = 'D:/record_tools/readyForUploading';
const jsonDurationMapPath = path.join(__dirname, '..', 'durationMap.json');

const addPadStart = (num: number) => String(num).padStart(3, '0');

const endPrompt = getPromptFn('jobs done...');

const main = async () => {
  const videoSet = new Set<string>();
  const nameMap = new Map<string, Detail>();
  let durationMap = new Map<string, number>();

  if (fs.existsSync(jsonDurationMapPath)) {
    const jsonData = JSON.parse(
      fs.readFileSync(jsonDurationMapPath, 'utf8'),
    ) as Record<string, number>;
    durationMap = new Map(Object.entries(jsonData));
  }

  const videos = getFileWithExt(rootPath, ['.mp4']);

  const currentVideoNames = new Set<string>();
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    if (!video) continue;

    const twitchRegex = /(.*)_\d*_Twitch/;
    const defaultName = video.split('_')[0];
    const name = video.includes('Twitch')
      ? twitchRegex.exec(video)?.[1] || defaultName
      : defaultName;

    if (!name) continue;

    const filePath = path.join(rootPath, video);

    console.log(
      `[${addPadStart(i + 1)}/${addPadStart(videos.length)}] check ${video}`,
    );
    const duration =
      durationMap.get(video) || (await getMediaDuration(filePath));

    const data = nameMap.get(name);

    const accCount = data?.count || 0;
    const accDuration = data?.duration || 0;
    nameMap.set(name, {
      duration: accDuration + duration,
      count: accCount + 1,
    });

    videoSet.add(video);
    currentVideoNames.add(video);
    durationMap.set(video, duration);
  }

  // 移除未存在的檔案
  for (const [name] of durationMap) {
    if (!currentVideoNames.has(name)) durationMap.delete(name);
  }

  const over12HrsList = [];
  const percentageSrtList = [];

  for (const [name, value] of nameMap) {
    const { duration, count } = value;
    const time = secondsToHMS(duration);
    const percent = (100 * duration) / (12 * 60 * 60);
    const percentText = percent.toFixed(2) + '%';

    percentageSrtList.push({ name, time, count, percent, percentText });
    if (percent > 80) over12HrsList.push({ name, time, percent: percentText });
  }

  percentageSrtList.sort((a, b) => a.percent - b.percent);

  const readyVideoList = percentageSrtList.slice(-10);
  console.log(readyVideoList);
  console.log('over 12 * 80% List', over12HrsList);

  const combineVideos = readyVideoList.reduce((acc, video) => {
    return acc.concat(video.name);
  }, [] as string[]);

  // 移動影片，但累積超過 12 小時就停止移動
  const checkDurationBelow12hrsMap = new Map<string, number>();
  for (const [video, duration] of durationMap) {
    if (!combineVideos.some((name) => video.includes(name))) continue;

    const twitchRegex = /(.*)_\d*_Twitch/;
    const defaultName = video.split('_')[0];
    const name = video.includes('Twitch')
      ? twitchRegex.exec(video)?.[1] || defaultName
      : defaultName;

    if (!name) continue;

    const currentDuration = checkDurationBelow12hrsMap.get(name) || 0;
    if (currentDuration + duration > 12 * 60 * 60) continue;
    checkDurationBelow12hrsMap.set(name, currentDuration + duration);

    const from = path.join(rootPath, video);
    const to = path.join(combineCheckDir, video);
    fs.renameSync(from, to);
  }

  // 移除已經不存在的檔案
  for (const [name] of durationMap) {
    if (!videoSet.has(name)) durationMap.delete(name);
  }

  const output = Array.from(durationMap.entries()).reduce(
    (acc, [name, duration]) => {
      acc[name] = duration;
      return acc;
    },
    {} as Record<string, number>,
  );
  fs.writeFileSync(jsonDurationMapPath, JSON.stringify(output), 'utf8');

  await endPrompt();
};

main();
