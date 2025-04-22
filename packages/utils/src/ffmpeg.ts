import path from 'path';
import cp from 'child_process';
import promiseFs from 'fs/promises';

interface GetMediaDurationOptions {
  timeout?: number;
}

export function getMediaDuration(
  filePath: string,
  options: GetMediaDurationOptions = {},
): number {
  const timeout = options.timeout || 1000 * 60;
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`;
    const stdout = cp.execSync(command, { timeout }).toString();
    return parseFloat(stdout);
  } catch (error) {
    console.error(error);
    return 0;
  }
}

interface getResolutionRes {
  width: number | null;
  height: number | null;
}

export function getResolution(filePath: string) {
  const payload: getResolutionRes = { width: null, height: null };
  try {
    const res = cp.execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of default=nw=1 ${filePath}`,
    );

    const resultString = res.toString();

    const width = /width=(\d+)/g.exec(resultString);
    if (width?.[1]) payload.width = Number(width[1]);

    const height = /height=(\d+)/g.exec(resultString);
    if (height?.[1]) payload.height = Number(height[1]);

    return payload;
  } catch (error) {
    console.error(error);
    return payload;
  }
}

export function isVideoFile(filePath: string) {
  try {
    const res = cp.execSync(
      `ffprobe -loglevel error -show_entries stream=codec_type -of default=nw=1:nk=1 ${filePath}`,
    );
    return res.toString().includes('video');
  } catch (error) {
    console.error(error);
    return false;
  }
}

// #region 分割影片
interface SplitVideoOptions {
  debug?: boolean;
  exportPath?: string;
}

export function splitVideo(
  filePath: string,
  segmentSec: number,
  options: SplitVideoOptions = {},
) {
  const { name, ext, dir } = path.parse(filePath);

  const exportFilePath = options.exportPath || dir;

  const cmds = `-i ${filePath} -f segment -segment_time ${segmentSec} -vcodec copy -individual_header_trailer 1 -reset_timestamps 1 ${exportFilePath}\\${name}_%03d${ext}`;

  return new Promise((resole, reject) => {
    try {
      const task = cp.spawn('ffmpeg', cmds.split(' '));

      if (options.debug) {
        console.log(`[FFMPEG]: split cmds: ${cmds}\r\n`);
        task.stderr.on('data', (d) => console.log(d.toString()));
      }

      task.on('close', resole);
    } catch (error) {
      console.error(error);

      reject();
    }
  });
}
// #endregion

// #region 剪輯影片
interface ClipVideoOptions {
  start: string;
  to: string;
  debug?: boolean;
  suffix?: string;
  exportExt?: string;
  exportPath?: string;
  ffmpegSetting?: string;
}

interface ClipVideoResult {
  filename: string;
  exportFilePath: string;
}

export function clipVideo(
  filePath: string,
  options: ClipVideoOptions,
): Promise<ClipVideoResult> {
  const {
    start,
    to,
    suffix = '_edit',
    exportExt,
    exportPath,
    ffmpegSetting,
  } = options;
  const { name, dir } = path.parse(filePath);

  const exportVideoDirPath = exportPath || dir;

  if (!start && !to)
    throw Error(
      `fail to clip video: ${filePath} due to neither start time nor to time is provided`,
    );

  const startTime = start ? `-ss ${start} ` : '';
  const toTime = to ? `-to ${to} ` : '';
  const setting = ffmpegSetting ? ` ${ffmpegSetting}` : '';

  const ext = exportExt
    ? exportExt.startsWith('.')
      ? exportExt
      : `.${exportExt}`
    : '.mp4';
  const exportVideoFilename = `${name}${suffix}${ext}`;
  const exportVideoFilePath = path.join(
    exportVideoDirPath,
    exportVideoFilename,
  );

  const cmds = `${startTime}-i ${filePath} ${toTime}-c copy${setting} ${exportVideoFilePath}`;

  const payload = {
    filename: exportVideoFilename,
    exportFilePath: exportVideoFilePath,
  };

  return new Promise((resole, reject) => {
    try {
      const task = cp.spawn('ffmpeg', cmds.split(' '));

      if (options.debug) {
        console.log(`[FFMPEG]: clip cmds: ${cmds}; pid:${task?.pid}\r\n`);
        task.stderr.on('data', (d) => console.log(d.toString()));
      }

      task.on('close', () => resole(payload));
    } catch (error) {
      console.error(error);

      reject(payload);
    }
  });
}
// #endregion

// #region 合併影片
async function makeCombineList(fileFullPaths: string[]) {
  if (fileFullPaths.length === 0 || fileFullPaths.length === 1)
    throw new Error('invalid number of files, two files required at least.');

  const { dir } = path.parse(fileFullPaths[0]);
  const listPath = path.join(dir, `combine-list-${Date.now()}.txt`);

  const txt = fileFullPaths
    .map((filename) => `file '${filename.replace(/\\/g, '/')}'`)
    .join('\r\n');

  await promiseFs.writeFile(listPath, txt);

  return listPath;
}

async function removeCombineList(listPath: string) {
  await promiseFs.unlink(listPath);
}

interface CombineVideosOptions {
  debug?: boolean;
  suffix?: string;
  exportExt?: string;
  exportPath?: string;
  ffmpegSetting?: string;
  exportFileName?: string;
}

export async function combineVideos(
  fileFullPaths: string[],
  options: CombineVideosOptions = {},
): Promise<void> {
  if (fileFullPaths.length === 0 || fileFullPaths.length === 1)
    throw new Error('invalid number of files, two files required at least.');

  const {
    suffix = '_combine',
    exportExt,
    exportPath,
    ffmpegSetting,
    exportFileName,
  } = options;

  const combineListPath = await makeCombineList(fileFullPaths);

  const [firstFile] = fileFullPaths;
  const { name, ext, dir } = path.parse(firstFile);
  const parseExportFileName = path.parse(exportFileName || '')?.name;

  const exportVideoDirPath = exportPath || dir;
  const extension = exportExt
    ? exportExt.startsWith('.')
      ? exportExt
      : `.${exportExt}`
    : ext;
  const exportVideoFilename = `${parseExportFileName || name}${suffix}${extension}`;
  const exportVideoFilePath = path.join(
    exportVideoDirPath,
    exportVideoFilename,
  );

  const args = [
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    combineListPath,
    '-y',
    ...(ffmpegSetting ? ffmpegSetting.split(' ') : []),
    '-c',
    'copy',
    exportVideoFilePath,
  ];

  return new Promise((resolve, reject) => {
    try {
      const task = cp.spawn('ffmpeg', args);

      if (options.debug) {
        console.log(
          `[FFMPEG]: clip cmds: ${args.join(' ')}; pid:${task?.pid}\r\n`,
        );
        task.stderr.on('data', (d) => console.log(d.toString()));
      }

      task.on('close', () => {
        removeCombineList(combineListPath);
        resolve();
      });
    } catch (error) {
      console.error(error);

      reject();
    }
  });
}
// #endregion
