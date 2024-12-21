'use strict';
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';

fs.writeFileSync(
  'createThumbnail.bat',
  `
  @echo off
  setlocal

  node ${path.join(cwd(), 'dist/index.js')} --folderPath "%CD%" %*

  endlocal
  `,
);
