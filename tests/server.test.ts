import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { SERVER_VERSION } from '../src/server/version.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string;
  mcpName?: string;
};
const serverManifest = JSON.parse(readFileSync(join(root, 'server.json'), 'utf8')) as {
  name: string;
  version: string;
  description: string;
  packages?: Array<{ identifier: string; version: string }>;
};

test('server version matches package.json', () => {
  assert.equal(SERVER_VERSION, packageJson.version);
});

test('server.json aligns with package metadata for MCP registry', () => {
  assert.equal(serverManifest.name, packageJson.mcpName);
  assert.equal(serverManifest.version, packageJson.version);
  assert(serverManifest.description.length <= 100, 'MCP Registry rejects descriptions over 100 characters');
  const npmPackage = serverManifest.packages?.[0];
  assert(npmPackage);
  assert.equal(npmPackage.identifier, '@intellmedia/basecoat-ui-mcp');
  assert.equal(npmPackage.version, packageJson.version);
});
