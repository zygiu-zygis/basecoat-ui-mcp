import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, symlink, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readProjectContext } from '../src/design/project.js';

test('DESIGN read is bounded, UTF-8 safe, and does not search parent projects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-context-'));
  try {
    await writeFile(join(root, 'DESIGN.md'), '# Project\n' + '界'.repeat(3000));
    const found = await readProjectContext(root);
    assert.equal(found.status, 'found');
    assert.equal(found.truncated, true);
    assert(Buffer.byteLength(found.content!) <= 6000);
    assert(!found.content!.includes('\uFFFD'));
    await mkdir(join(root, 'child'));
    assert.equal((await readProjectContext(join(root, 'child'))).status, 'absent');
  } finally { await rm(root, { recursive: true }); }
});

test('DESIGN truncation prefers newline or sentence boundaries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-context-boundary-'));
  try {
    const body = 'Alpha beta gamma delta. '.repeat(400);
    await writeFile(join(root, 'DESIGN.md'), '# Title\n\n' + body);
    const found = await readProjectContext(root);
    assert.equal(found.status, 'found');
    assert.equal(found.truncated, true);
    assert(Buffer.byteLength(found.content!) <= 6000);
    assert.match(found.content!, /(\n|\.\s)$/);
    assert(!found.content!.includes('\uFFFD'));
  } finally { await rm(root, { recursive: true }); }
});

test('DESIGN truncation stays UTF-8 safe without text boundaries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-context-utf8-'));
  try {
    await writeFile(join(root, 'DESIGN.md'), '界'.repeat(2500));
    const found = await readProjectContext(root);
    assert.equal(found.status, 'found');
    assert.equal(found.truncated, true);
    assert(Buffer.byteLength(found.content!) <= 6000);
    assert.match(found.content!, /^(界)+$/);
    assert(!found.content!.includes('\uFFFD'));
  } finally { await rm(root, { recursive: true }); }
});

test('DESIGN symlinks and directories are not read', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-context-'));
  try {
    await writeFile(join(root, 'private.md'), 'private');
    await symlink(join(root, 'private.md'), join(root, 'DESIGN.md'));
    assert.equal((await readProjectContext(root)).status, 'unavailable');
    await rm(join(root, 'DESIGN.md'));
    await mkdir(join(root, 'DESIGN.md'));
    assert.equal((await readProjectContext(root)).status, 'unavailable');
  } finally { await rm(root, { recursive: true }); }
});
