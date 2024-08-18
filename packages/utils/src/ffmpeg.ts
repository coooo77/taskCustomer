import cp from 'child_process';

export function getMediaDuration(filePath: string): number {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`;
    const stdout = cp.execSync(command, { timeout: 5000 }).toString();
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
