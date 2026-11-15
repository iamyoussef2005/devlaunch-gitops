'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const chart = path.resolve(__dirname, '..');
const helm = process.env.HELM_BIN || 'helm';
const render = (...args) => execFileSync(helm, ['template', 'test', chart, ...args], { encoding: 'utf8' });

test('defaults use the platform account and render probes and limits', () => {
  const output = render();
  assert.match(output, /serviceAccountName: devlaunch-app/);
  assert.doesNotMatch(output, /kind: ServiceAccount/);
  assert.match(output, /path: "\/ready"/);
  assert.match(output, /path: "\/health"/);
  assert.match(output, /memory: 256Mi/);
  assert.match(output, /runAsNonRoot: true/);
});

test('custom images and optional service account are supported', () => {
  const output = render('--set', 'image.repository=example/app', '--set', 'image.tag=v2', '--set', 'serviceAccount.create=true', '--set', 'serviceAccount.name=other-app');
  assert.match(output, /image: "example\/app:v2"/);
  assert.match(output, /kind: ServiceAccount/);
  assert.match(output, /serviceAccountName: other-app/);
});

test('rejects floating latest tag and attempts to create platform account', () => {
  for (const args of [['--set', 'image.tag=latest'], ['--set', 'serviceAccount.create=true']]) {
    assert.notEqual(spawnSync(helm, ['template', 'test', chart, ...args]).status, 0);
  }
});
