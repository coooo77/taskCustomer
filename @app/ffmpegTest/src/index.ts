import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { parse } from 'shell-quote';
import { getFileWithExt, secondsToHMS, getFileSize } from '@util/utils';

interface Config {
  key: string;
  value: (string | null)[];
}

interface TestConfigs {
  speed: Config[];
  preset: Config[];
  quality: Config[];
}

/**
 有參數的情況下，會寫入 key + value
 空字串則是寫入 key
 null 則是不帶入該參數
 */
const configs: TestConfigs = {
  quality: [
    // {
    //   key: '-b',
    //   value: ['350k', '1M'],
    // },
    {
      key: '-b:v',
      value: ['150k', '350K', '700k'],
    },
    {
      key: '-cq',
      value: ['18', '21', '30'],
    },
    {
      key: '-crf',
      value: ['18', '21', '30'],
    },
  ],
  speed: [
    // 加速同時需要去除音軌、或者加速音軌 -filter_complex "[0:v]setpts=PTS/4[v];[0:a]atempo=4[a]"
    {
      key: '-an -filter:v',
      value: ['setpts=PTS/2', 'setpts=PTS/4', null],
    },

    {
      key: '-an',
      value: ['', null],
    },
  ],
  preset: [
    {
      key: '-vcodec libx264 -preset',
      value: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast'],
    },
    {
      // 相關參數用 ffmpeg -h encoder=h264_nvenc 查詢
      key: '-vcodec h264_nvenc -preset',
      value: ['p1', 'p4', 'p7', 'hq', 'fast', 'slow', 'medium'],
    },
  ],
};

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
      if (v === null) continue;

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

interface ExportConfig {
  cmd: string;
  index: string;
  configString: string;
  outputFilePath: string;
}

function generateConfig(samplePath: string) {
  const { quality, speed, preset } = configs;

  const cmds: ExportConfig[] = [];

  const sConfigs = getConfigs(speed);
  const pConfigs = getConfigs(preset);
  const qConfigs = getConfigs(quality);

  let index = 0;

  for (const q of qConfigs) {
    for (const s of sConfigs) {
      for (const p of pConfigs) {
        index++;
        const qConfig = q ? ` ${q}` : '';
        const pConfig = p ? ` ${p}` : '';
        const sConfig = s ? ` ${s}` : '';
        const configString = `${qConfig}${pConfig}${sConfig}`;

        const filename = generateOutputPath(samplePath, index);
        const cmd = `-i "${samplePath}" -y${configString} "${filename}"`;
        cmds.push({
          cmd,
          configString,
          index: getIndex(index),
          outputFilePath: filename,
        });
      }
    }
  }

  return cmds;
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
  configString: string;
  compressRatio: string;
  inputFilePath: string;
  outputFilePath: string;
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

  const newName = `${name}_${sanitizeFilename(s.configString)}_${s.duration}${ext}`;
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

  for (const s of samples) {
    const inputFilePath = path.join(sampleDir, s);
    const configs = generateConfig(inputFilePath);
    const inputFileSize = await getFileSize(inputFilePath);

    for (const c of configs) {
      const { cmd, index, configString, outputFilePath } = c;

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
        configString,
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
