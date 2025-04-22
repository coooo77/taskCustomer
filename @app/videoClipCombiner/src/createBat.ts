'use strict';
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';

fs.writeFileSync(
  'videoClipCombiner.bat',
  `
  @echo off
  setlocal

  node ${path.join(cwd(), 'dist/index.js')} --folderPath "%CD%" %*

  endlocal
  `,
);
