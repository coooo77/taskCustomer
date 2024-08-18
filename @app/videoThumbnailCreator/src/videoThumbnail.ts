'use strict';

import path from 'path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { spawn } from 'child_process';

import { getMediaDuration } from '@util/utils';

import type { OverlayOptions } from 'sharp';

// 動態擷取幀並返回 Buffer
function captureFrameBuffer(videoPath: string, time: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn('ffmpeg', [
      '-ss',
      time.toString(), // 設置起始時間
      '-i',
      videoPath, // 影片檔案路徑
      '-frames:v',
      '1', // 只擷取一個幀
      '-f',
      'image2pipe', // 指定輸出格式為 image2pipe
      '-vcodec',
      'png', // 使用 png 編碼
      'pipe:1', // 輸出到 stdout
    ]);

    const buffers: Buffer[] = [];
    ffmpegProcess.stdout.on('data', (chunk) => {
      buffers.push(chunk);
    });

    ffmpegProcess.stdout.on('end', () => {
      const buffer = Buffer.concat(buffers);
      resolve(buffer);
    });

    ffmpegProcess.on('error', (err) => reject(err));
  });
}

async function captureFrames(
  videoPath: string,
  times: number[],
  limit: number,
): Promise<Buffer[]> {
  const limitConcurrency = pLimit(limit);

  const buffers = await Promise.all(
    times.map((time) =>
      limitConcurrency(() => captureFrameBuffer(videoPath, time)),
    ),
  );

  return buffers;
}

// 格式化時間為 HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// 計算擷取時間點
function calculateCaptureTimes(
  duration: number,
  row: number,
  col: number,
): number[] {
  const totalFrames = row * col;
  const interval = duration / totalFrames;
  return Array.from({ length: totalFrames }, (_, i) =>
    Math.floor(i * interval),
  );
}

// 生成時間戳文本層
function createTimestampLayer(
  timestamp: string,
  width: number,
  fontSize: number,
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${fontSize + 10}">
            <rect x="0" y="0" width="100%" height="${fontSize + 10}" fill="white"/>
            <text x="50%" y="${fontSize / 2 + 5}" font-size="${fontSize}" text-anchor="middle" fill="black" dy=".3em">${timestamp}</text>
        </svg>`,
  );
}

// 參數接口
export interface CreateThumbnailParams {
  col?: number; // 列數，預設值 3
  row?: number; // 行數，預設值 3
  thumbnailFilePath?: string; // 縮圖路徑
  width?: number; // 縮圖寬度，預設 1024px
  limit?: number; // buffer 同步擷取數量，預設值 3
  withTimestamp?: boolean; // 每截圖是否要在截圖下方顯示該截圖擷取的時間 Timestamp，預設 true
}

// 合併圖片並在最上面顯示檔案名稱
export async function createThumbnail(
  videoPath: string,
  options: CreateThumbnailParams = {},
): Promise<void> {
  const parse = path.parse(videoPath);

  const {
    col = 3,
    row = 3,
    width = 1024,
    limit = 3,
    withTimestamp = true,
    thumbnailFilePath = path.join(parse.dir, `${path.basename(videoPath)}.jpg`),
  } = options;

  // 獲取影片總長度
  const duration = await getMediaDuration(videoPath);
  const times = calculateCaptureTimes(duration, row, col);
  const buffers = await captureFrames(videoPath, times, limit);

  // 先取得第一張圖片的元數據
  const firstImage = sharp(buffers[0]);
  const { width: originalWidth, height: originalHeight } =
    await firstImage.metadata();

  // 計算每張圖片的寬度與高度
  const scaledWidth = Math.round(width / col); // 寬度直接分配給每一列
  const scaleRatio = scaledWidth / originalWidth!; // 計算比例
  const scaledHeight = Math.round(scaleRatio * originalHeight!);

  // 動態計算文字大小
  const titleFontSize = Math.round(scaleRatio * 72); // 基於原始值的比例調整
  const timestampFontSize = Math.round(scaleRatio * 48); // 基於原始值的比例調整

  const images = await Promise.all(
    buffers.map((buffer) =>
      sharp(buffer)
        .resize({ width: scaledWidth, height: scaledHeight })
        .toBuffer(),
    ),
  );

  // 檔案名稱的文字層
  const filename = path.basename(videoPath);
  const textLayer = Buffer.from(
    `<svg width="${scaledWidth * col}" height="${titleFontSize + 10}">
            <rect x="0" y="0" width="100%" height="100%" fill="white"/>
            <text x="50%" y="${titleFontSize / 2 + 5}" font-size="${titleFontSize}" text-anchor="middle" fill="black" dy=".3em">${filename}</text>
        </svg>`,
  );

  // 計算總高度
  const timestampHeight = withTimestamp
    ? scaledHeight + timestampFontSize + 10
    : scaledHeight;
  const totalHeight = timestampHeight * row + titleFontSize + 10;

  // 創建縮圖背景
  const thumbnail = sharp({
    create: {
      width: scaledWidth * col,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  });

  const compositeImages: OverlayOptions[] = [];
  for (let i = 0; i < images.length; i++) {
    const timestamp = formatTime(times[i]!);
    const timestampLayer = withTimestamp
      ? createTimestampLayer(timestamp, scaledWidth, timestampFontSize)
      : null;

    compositeImages.push({
      input: images[i],
      top:
        Math.floor(i / col) *
          (scaledHeight + (timestampLayer ? timestampFontSize + 10 : 0)) +
        titleFontSize +
        10,
      left: (i % col) * scaledWidth,
    });

    if (timestampLayer) {
      compositeImages.push({
        input: timestampLayer,
        top:
          Math.floor(i / col) * (scaledHeight + timestampFontSize + 10) +
          scaledHeight +
          titleFontSize +
          10,
        left: (i % col) * scaledWidth,
      });
    }
  }

  // 合併圖片和檔案名稱
  thumbnail
    .composite([{ input: textLayer, top: 0, left: 0 }, ...compositeImages])
    .toFile(thumbnailFilePath, (err, info) => {
      if (err) console.error(err);
      console.log('Thumbnail created:', info);
    });
}
