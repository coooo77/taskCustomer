'use strict';
import fs from 'fs';
import path from 'path';

const cmd = `
@echo off
setlocal
node "${path.join(process.cwd(), './dist/index.js')}" %CD%
endlocal
`;

fs.writeFileSync('upload-tel.bat', cmd);
