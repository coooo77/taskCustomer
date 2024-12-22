import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { parse } from 'shell-quote';

import { configs } from './configs';
import { getFileWithExt, secondsToHMS, getFileSize } from '@util/utils';

import type { Config } from './configs';

function getIndex(index: number) {
  return String(index).padStart(3, '0');
}

function generateOutputPath(sampleName: string, index: number) {
  const { name, dir } = path.parse(sampleName);
  const idx = getIndex(index);
  return path.join(dir, `${name}_${idx}.mp4`);
}

function getConfigs(c: Config[]) {
  return c.reduce((setting, item) => {
    const { key, value } = item;
    for (const v of value) {
      if (v === null) {
        setting.push('');
        continue;
      }

      if (v === '') {
        setting.push(key);
        continue;
      }

      setting.push(`${key} ${v}`);
    }
    return setting;
  }, [] as string[]);
}

// 非字母、數字、- 或 _ 的字元都替換成 _
function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function addConfigs(source: string[], newConfig: string[]) {
  return newConfig.flatMap((n) =>
    source.map((s) => (s && n ? `${s} ${n}` : s || n)),
  );
}

function recursiveGetConfig(configGroup: string[][], output: string[] = []) {
  for (let i = 0; i < configGroup.length; i++) {
    const configs = configGroup[i]!;

    if (output.length === 0)
      return recursiveGetConfig(configGroup.slice(1), configs);

    const nextConfig = configGroup[i + 1]!;
    if (!nextConfig) return addConfigs(output, configs);

    return recursiveGetConfig(
      configGroup.slice(1),
      addConfigs(output, configs),
    );
  }

  return output;
}

function getFFmpegSettings() {
  return Array.from(
    new Set(recursiveGetConfig(configs.map(getConfigs))),
  ).sort();
}

interface ExportConfig {
  cmd: string;
  index: string;
  ffmpegSetting: string;
  outputFilePath: string;
}

function generateConfig(
  samplePath: string,
  ffmpegSettings: string[],
): ExportConfig[] {
  return ffmpegSettings.map((fSettings, index) => {
    const filename = generateOutputPath(samplePath, index);
    const cmd = `-i "${samplePath}" -y ${fSettings} "${filename}"`;
    return {
      cmd,
      ffmpegSetting: fSettings,
      index: getIndex(index),
      outputFilePath: filename,
    };
  });
}

function getDurationInSec(startTime: Date, endTime: Date) {
  return secondsToHMS((endTime.getTime() - startTime.getTime()) / 1000);
}

interface TestResult {
  duration: string;
  endTime: Date;
  startTime: Date;
}

interface ExportTestResult extends TestResult {
  index: string;
  compressRatio: string;
  inputFilePath: string;
  outputFilePath: string;
  ffmpegSettings: string;
}

function testSample(cmd: string): Promise<TestResult> {
  return new Promise((res, rej) => {
    const startTime: Date = new Date();

    const payload = {
      startTime: startTime,
    };

    try {
      const args = parse(cmd).filter(
        (arg) => typeof arg === 'string',
      ) as string[];

      const task = cp.spawn('ffmpeg', args);

      task.stderr.on('data', (data) => {
        console.log(data.toString());
      });

      task.on('close', () => {
        const endTime = new Date();
        res({
          ...payload,
          endTime: new Date(),
          duration: getDurationInSec(startTime, endTime),
        });
      });
    } catch (error) {
      console.error(error);
      const endTime = new Date();
      rej({
        ...payload,
        endTime: endTime,
        duration: getDurationInSec(startTime, endTime),
      });
    }
  });
}

function renameOutputFilename(s: ExportTestResult) {
  if (!fs.existsSync(s.outputFilePath)) return;

  const { name, ext, dir } = path.parse(s.outputFilePath);

  const newName = `${name}_${sanitizeFilename(s.ffmpegSettings)}_${s.duration}${ext}`;
  const newFilePath = path.join(dir, newName);
  fs.renameSync(s.outputFilePath, newFilePath);
}

function getDuration(s: ExportTestResult) {
  const startTime = new Date(s.startTime);
  const endTime = new Date(s.endTime);
  return endTime.getTime() - startTime.getTime();
}

async function main() {
  const sampleDir = path.join(__dirname, '../samples');
  const samples = getFileWithExt(sampleDir, ['.mp4', '.ts', '.mkv']);

  if (samples.length === 0) {
    console.log('No sample files found.');
    process.exit(1);
  }

  const results: ExportTestResult[] = [];
  const testResultFilename = `test_results_${Date.now()}.json`;
  const testResultFilePath = path.join(__dirname, testResultFilename);

  const ffmpegSettings = getFFmpegSettings();
  console.log(`${ffmpegSettings.length} cmds generated.`);

  for (const s of samples) {
    const inputFilePath = path.join(sampleDir, s);
    const configs = generateConfig(inputFilePath, ffmpegSettings);
    const inputFileSize = await getFileSize(inputFilePath);

    for (const c of configs) {
      const { cmd, index, ffmpegSetting, outputFilePath } = c;

      const res = await testSample(cmd);

      const outputFileSize = await getFileSize(outputFilePath);
      const compressRatio = (outputFileSize / inputFileSize) * 100;

      // if (compressRatio > 100 || compressRatio === 0) {
      //   fs.unlinkSync(outputFilePath);
      //   continue;
      // }

      const result: ExportTestResult = {
        ...res,
        index,
        inputFilePath,
        outputFilePath,
        ffmpegSettings: ffmpegSetting,
        compressRatio: compressRatio.toFixed(2),
      };
      renameOutputFilename(result);

      results.push(result);
      fs.writeFileSync(testResultFilePath, JSON.stringify(results));
    }
  }

  results.sort((a, b) => getDuration(a) - getDuration(b));
  fs.writeFileSync(testResultFilePath, JSON.stringify(results));
}

main();
