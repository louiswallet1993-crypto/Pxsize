'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const lock = require('../package-lock.json');

assert.ok(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22 ou plus est requis');
assert.equal(lock.version, pkg.version, 'Version du lockfile incohérente');
assert.equal(lock.packages[''].version, pkg.version);
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
if (process.env.EXPECTED_ARCH) assert.equal(process.arch, process.env.EXPECTED_ARCH);
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
  assert.equal(process.env.GITHUB_REF, `refs/tags/v${pkg.version}`, 'Le tag doit correspondre à package.json');
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const scripts = [path.join(root, 'main.js'), ...walk(path.join(root, 'src')), ...walk(__dirname)]
  .filter(file => /\.(?:cjs|js)$/.test(file));
for (const file of scripts) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(?:https?:|data:|#)/.test(ref)) continue;
  assert.ok(fs.existsSync(path.join(root, decodeURIComponent(ref))), `Ressource manquante : ${ref}`);
}
for (const file of walk(path.join(root, 'styles'))) {
  for (const [, ref] of fs.readFileSync(file, 'utf8').matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    if (/^(?:https?:|data:)/.test(ref)) continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(ref))), `Ressource manquante : ${ref}`);
  }
}

for (const file of ['build/icon.ico', 'build/icon.png', 'ASSETS/FONTS/TEKTUR/OFL.txt', 'ASSETS/FONTS/TRADE WINDS/OFL.txt']) {
  assert.ok(fs.statSync(path.join(root, file)).size > 0, `Fichier requis : ${file}`);
}
const ffmpeg = require('ffmpeg-static');
assert.ok(ffmpeg, 'FFmpeg indisponible pour cette plateforme');
for (const suffix of ['', '.LICENSE', '.README']) assert.ok(fs.statSync(ffmpeg + suffix).size > 0);
const version = execFileSync(ffmpeg, ['-version'], { encoding: 'utf8', windowsHide: true }).split('\n')[0];
console.log(`PXSize ${pkg.version} : ${scripts.length} fichiers JavaScript et ressources vérifiés.`);
console.log(`${process.platform}/${process.arch} — ${version}`);
