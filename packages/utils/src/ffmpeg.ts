import path from 'path';
import cp from 'child_process';

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
        console.log(`[FFMPEG]: split cmds: ${cmds}`);
        task.stderr.on('data', (d) => console.log(d.toString()));
      }

      task.on('close', resole);
    } catch (error) {
      console.error(error);

      reject();
    }
  });
}
