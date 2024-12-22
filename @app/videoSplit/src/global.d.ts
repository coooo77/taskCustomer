'use strict';

interface VideoSplitParams {
  // 影片大小大於 N 才進行分割，預設 1.9GB 以上，填入範例 1.9GB
  min?: string;
  // 分割大小 NB，預設 1.9GB，填入範例 1.9GB
  divide?: string;
}

interface CUSTOM_PARAM extends VideoSplitParams {
  // 需要截圖的影片類型預設是 mp4
  ext?: string[];
  // 列印錯誤訊息
  debug?: boolean;
}

declare global {
  var __CUSTOM_PARAM: CUSTOM_PARAM;
}

export {};
