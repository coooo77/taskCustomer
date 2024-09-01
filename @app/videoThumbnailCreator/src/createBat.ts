'use strict';
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';

fs.writeFileSync(
  'createThumbnail.bat',
  `
  @echo off
  setlocal

  REM 獲取當前批次檔案的執行位置
  set "current_dir=%~dp0"

  REM 傳遞當前目錄作為參數給 Node.js 腳本
  node ${path.join(cwd(), 'dist/index.js')} %current_dir% --ext=mp4 --ext=ts --limit=5

  endlocal
  `,
);
