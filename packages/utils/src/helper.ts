'use strict';

import readline from 'readline';

export function secondsToHMS(seconds: number) {
  const sec = seconds;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = Math.floor(sec % 60);

  let result = '';

  if (hours > 0) {
    result += `${hours} 小時 `;
  }

  if (minutes > 0) {
    result += `${minutes} 分鐘 `;
  }

  result += `${remainingSeconds} 秒`;

  return result.trim(); // 移除字符串开头和结尾的空格
}

export function getPromptFn(msg: string) {
  let rl: readline.Interface | null = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return () =>
    new Promise<string>((resolve) => {
      rl!.question(msg, (reply) => {
        rl!.close();
        resolve(reply);
        rl = null;
      });
    });
}

export function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

interface RetryFnOptions {
  name?: string;
  maxRetries?: number;
  retryDelayInSec?: number;
}

export async function retryFn<T extends () => any>(
  cb: T,
  options: RetryFnOptions = {},
) {
  const { name = 'Task', maxRetries = 5, retryDelayInSec = 1000 } = options;

  let err: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res: ReturnType<T> = await cb();
      return res;
    } catch (error) {
      err = error;
      console.log(`${name} failed ${i + 1} times, wait ${retryDelayInSec} ms.`);
      await wait(retryDelayInSec);
    }
  }

  throw err;
}

export function padStart0(value: any, num = 3) {
  return String(value).padStart(num, '0');
}
