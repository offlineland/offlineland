// Usage: bun run _code/local-tools/split-ids-by-prefix.ts ./all-ids.json ./static/offlineland/public-creations/ 3

import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'


const allIdsFilePath = z.string().parse(Bun.argv[2]);
const outputDirPath = z.string().parse(Bun.argv[3]);
const prefixLength = z.coerce.number().parse(Bun.argv[4]);


const allIds: string[] = await Bun.file(allIdsFilePath).json();


const map = new Map<string, string[]>();
for (const id of allIds) {
    const prefix = id.substring(0, prefixLength)

    if (map.has(prefix) === false) map.set(prefix, []);
    map.get(prefix)!.push(id)
}


const dirname = path.join(outputDirPath, String(prefixLength));
if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
}
for (const [key, value] of map) {
    Bun.write(path.join(dirname, `${key}.json`), JSON.stringify(value));
}
