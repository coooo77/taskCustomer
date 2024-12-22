'use strict';
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';

fs.writeFileSync(
  'videoSplit.bat',
  `
  @echo off
  setlocal

  node ${path.join(cwd(), 'dist/index.js')} --p "%CD%" %*

  endlocal
  `,
);
