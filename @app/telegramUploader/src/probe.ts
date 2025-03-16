'use strict';
import fs from 'fs';
import path from 'path';
import robot from 'robotjs';
import readline from 'readline';

/** robotjs doc @see https://github.com/octalmage/robotjs/issues/773  */

// #region state
const position: Record<string, Position> = {};
const positionsToRecord = [
  { key: 'uploadBtn', desc: '上傳迴紋針圖案' },
  { key: 'choseFileUrl', desc: '上傳視窗資料夾位址 input' },
  { key: 'choseInput', desc: '上傳視窗檔案名稱 input' },
  { key: 'captionInput', desc: 'modal 出現時的底部白背景灰' },
];

let currentIndex = 0;
// #endregion

// #region main
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

console.log(
  `請將滑鼠移動到 **${positionsToRecord[currentIndex].desc}**，然後按 Enter 記錄座標...`,
);

interface Position {
  x: number;
  y: number;
  comment: string;
  color: string[];
}

function handleAnswer(confirmKey: string, payload: Omit<Position, 'comment'>) {
  switch (confirmKey.toLocaleLowerCase()) {
    case 'y': {
      position[positionsToRecord[currentIndex].key] = {
        ...payload,
        comment: positionsToRecord[currentIndex].desc,
      };
      currentIndex++;

      if (currentIndex < positionsToRecord.length) {
        console.log(
          `請將滑鼠移動到 **${positionsToRecord[currentIndex].desc}**，然後按 Enter 記錄座標...`,
        );
      } else {
        console.log('✅ 所有座標已記錄完成！');
        fs.writeFileSync(
          path.join('./dist/position.json'),
          JSON.stringify(position, null, 2),
          'utf8',
        );
        console.log('💾 已儲存至 `position.json`！');
        process.exit(0);
      }
      path;
      break;
    }
    default:
      console.log('請重新移動滑鼠到正確位置，然後按 Enter...');
      break;
  }
}

interface KeypressKeyParam {
  sequence: string;
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

process.stdin.on('keypress', (_, key: KeypressKeyParam) => {
  switch (key.name) {
    case 'return': {
      const { x, y } = robot.getMousePos();
      const color = robot.getPixelColor(x, y);
      console.log(`座標: x=${x}, y=${y}, 顏色: #${color}`);
      console.log("✅ 按 'y' 確認, 按 'n' 重新標記");

      process.stdin.once('keypress', (_, confirmKey: KeypressKeyParam) => {
        handleAnswer(confirmKey.name, { x, y, color: [color] });
      });
      break;
    }
    case 'c': {
      if (!key.ctrl) break;
      console.log('❌ 取消操作');
      process.exit();
    }
    default: {
      break;
    }
  }
});
// #endregion
