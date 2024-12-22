'use strict';

export interface Config {
  key: string;
  value: (string | null)[];
}

/**
 有參數的情況下，會寫入 key + value
 空字串則是寫入 key
 null 則是不帶入該參數
 */
export const configs: Config[][] = [
  // 指定 FPS 或 指定處理影片特定片段或許更方便
  [
    {
      key: '-r',
      value: ['30'],
    },
  ],
  [
    // 反而增加壓縮體積
    // {
    //   key: '-cq',
    //   value: ['18', '21', '30'],
    // },
    // {
    //   key: '-b',
    //   value: ['350k', '1M'],
    // },
    {
      key: '-b:v',
      value: ['550k', '1M', null],
      // value: ['550k', '750K', '1M', null],
    },
    {
      key: '-crf',
      value: ['18', '28', null],
    },
  ],
  [
    {
      key: '-rc',
      value: ['constqp', null],
    },
  ],
  // [
  //   {
  //     key: '-tune',
  //     value: ['hq', null],
  //   },
  // ],
  [
    // {
    //   key: '-g 1 -keyint_min 1',
    //   value: ['', '-bf 0'],
    // },
    {
      key: '-g 60 -keyint_min 60',
      value: ['', '-bf 0', '-bf 5'],
    },
    {
      key: '-g 120 -keyint_min 120',
      value: ['', '-bf 0', '-bf 5', null],
    },
  ],
  // [
  //   // 加速同時需要去除音軌、或者加速音軌 -filter_complex "[0:v]setpts=PTS/4[v];[0:a]atempo=4[a]"
  //   {
  //     key: '-an -filter:v',
  //     value: ['setpts=PTS/4'],
  //   },
  //   {
  //     key: '-an',
  //     value: ['', null],
  //   },
  // ],
  [
    {
      key: '-vcodec libx264 -preset',
      value: ['veryfast'],
      // value: ['superfast', 'veryfast', 'faster', 'fast'],
    },
    // 相關參數用 ffmpeg -h encoder=h264_nvenc 查詢
    {
      key: '-vcodec h264_nvenc -preset',
      value: ['p1', 'p4'],
      // value: ['p1', 'p4', 'p7', 'hq', 'fast'],
    },
  ],
];
