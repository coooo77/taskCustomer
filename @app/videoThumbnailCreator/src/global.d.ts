import type { CreateThumbnailParams } from './videoThumbnail.ts';

interface CreateThumbnailParams {
  // 列數，預設值 3
  col?: number;
  // 行數，預設值 3
  row?: number;
  // 縮圖路徑
  thumbnailFilePath?: string;
  // 縮圖寬度，預設 1024px
  width?: number;
  // buffer 同步擷取數量，預設值 3
  limit?: number;
  // 每截圖是否要在截圖下方顯示該截圖擷取的時間 Timestamp，預設 true
  withTimestamp?: boolean;
}

interface CUSTOM_PARAM extends CreateThumbnailParams {
  // 需要截圖的影片類型預設是 mp4
  ext: string[];
  // 列印錯誤訊息
  debug?: boolean;
  // 重試上限
  retry?: number;
  // 重試等待秒數
  wait?: number;
  // 讀取 buffer 最大等待秒數
  timeout?: number;
}

declare global {
  var __CUSTOM_PARAM: CUSTOM_PARAM;
}

export {};
