'use strict';
import fs from 'fs';

import { configs } from './configs';

import type { Config } from './configs';

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

function addConfigs(source: string[], newConfig: string[]) {
  return newConfig.flatMap((n) =>
    source.map((s) => (s && n ? `${s} ${n}` : s || n)),
  );
}

function geneConfig(configGroup: string[][], output: string[] = []) {
  for (let i = 0; i < configGroup.length; i++) {
    const configs = configGroup[i]!;

    if (output.length === 0) return geneConfig(configGroup.slice(1), configs);

    const nextConfig = configGroup[i + 1]!;
    if (!nextConfig) return addConfigs(output, configs);

    return geneConfig(configGroup.slice(1), addConfigs(output, configs));
  }

  return output;
}

function main() {
  const group = configs.map(getConfigs);
  fs.writeFileSync('configList.json', JSON.stringify(geneConfig(group).sort()));
}

main();
