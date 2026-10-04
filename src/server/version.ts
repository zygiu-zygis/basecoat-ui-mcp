import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packagePath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json');
export const SERVER_VERSION: string = JSON.parse(readFileSync(packagePath, 'utf8')).version as string;
