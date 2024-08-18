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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return () =>
    new Promise<string>((resolve) => {
      rl.question(msg, (reply) => {
        rl.close();
        resolve(reply);
      });
    });
}

export function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
