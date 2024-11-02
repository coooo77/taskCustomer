'use strict';
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';

fs.writeFileSync(
  'createThumbnail.bat',
  `
  @echo off
  setlocal

  set "current_dir=%~dp0"

  node ${path.join(cwd(), 'dist/index.js')} %current_dir% --ext=mp4 --ext=ts --limit=5

  endlocal
  `,
);
