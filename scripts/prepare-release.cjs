'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { version } = require('../package.json');
const prefix = `PXSize-${version}`;
const targets = {
  'win32-x64': [`${prefix}-Windows-Setup.exe`],
  'darwin-arm64': [`${prefix}-macOS-arm64.dmg`],
  'darwin-x64': [`${prefix}-macOS-x64.dmg`],
  'linux-x64': [`${prefix}-Linux-x86_64.AppImage`, `${prefix}-Linux-x64.tar.gz`]
};
const targetLabels = {
  'win32-x64': 'Windows 10 ou 11 — PC 64 bits Intel / AMD',
  'darwin-arm64': 'Mac avec une puce Apple (M1, M2, M3…)',
  'darwin-x64': 'Mac avec un processeur Intel',
  'linux-x64': 'Linux — PC 64 bits Intel / AMD'
};
const publishedTargets = require('../.github/release-platforms.json');
assert.ok(publishedTargets.length > 0 && publishedTargets.every(key => targets[key]), 'Plateformes de publication invalides');
assert.equal(new Set(publishedTargets).size, publishedTargets.length, 'Plateformes en double');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.match(sha, /^[a-f0-9]{40}$/);

function digest(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function emptyDir(dir) {
  if (fs.existsSync(dir)) assert.equal(fs.readdirSync(dir).length, 0, `Le dossier doit être vide : ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
}
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function fileInfo(file) { return { name: path.basename(file), size: fs.statSync(file).size, sha256: digest(file) }; }
function checksums(dir, files) {
  fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), files.sort().map(name => `${digest(path.join(dir, name))}  ${name}`).join('\n') + '\n');
}

if (process.argv[2] === '--collect') {
  assert.equal(process.argv.length, 5, 'Usage : node scripts/prepare-release.cjs --collect INPUT OUTPUT');
  const input = path.resolve(process.argv[3]);
  const output = path.resolve(process.argv[4]);
  assert.notEqual(input, output);
  const manifests = [];
  for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
    assert.ok(entry.isDirectory() && !entry.isSymbolicLink(), `Entrée inattendue : ${entry.name}`);
    const dir = path.join(input, entry.name);
    const files = fs.readdirSync(dir);
    const name = files.find(name => /^manifest-.*\.json$/.test(name));
    assert.ok(name, `Manifeste absent : ${entry.name}`);
    const manifest = json(path.join(dir, name));
    const key = `${manifest.platform}-${manifest.arch}`;
    assert.ok(publishedTargets.includes(key), `Cible non autorisée pour cette release : ${key}`);
    assert.equal(manifest.version, version);
    assert.equal(manifest.sha, sha, 'Les livrables doivent provenir du commit courant');
    assert.equal(manifest.testsPassed, true);
    assert.equal(manifest.layoutFits, true, 'Vérification visuelle de la fenêtre non satisfaite');
    assert.deepEqual(manifest.assets.map(asset => asset.name).sort(), [...targets[key]].sort());
    assert.deepEqual(files.sort(), [name, ...targets[key]].sort(), `Contenu inattendu : ${entry.name}`);
    for (const asset of manifest.assets) {
      assert.equal(path.basename(asset.name), asset.name);
      const source = path.join(dir, asset.name);
      assert.ok(fs.lstatSync(source).isFile());
      assert.deepEqual(fileInfo(source), asset, `Fichier altéré : ${asset.name}`);
    }
    manifests.push({ key, dir, manifest });
  }
  assert.deepEqual(manifests.map(item => item.key).sort(), [...publishedTargets].sort(), 'Il faut toutes les cibles autorisées, sans doublon');
  emptyDir(output);
  const files = [];
  for (const { dir, manifest } of manifests) {
    for (const { name } of manifest.assets) {
      fs.copyFileSync(path.join(dir, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
      files.push(name);
    }
  }
  const notice = `PXSIZE ${version} — PAR RASTRO\n\n` +
    `QUEL FICHIER CHOISIR ?\n` +
    publishedTargets.map(key => `${targetLabels[key]} : ${targets[key].join(' / ')}`).join('\n') + '\n\n' +
    `Glissez un fichier dans PXSize, choisissez un effet, puis cliquez sur EXPORT.\n` +
    `Images : PNG à leur taille d'origine. Vidéos : MP4 sans son, 30 images/s, largeur maximale 1100 pixels.\n\n` +
    `L'application n'est pas signée. Vérifiez sa provenance et ne désactivez pas vos protections.\n` +
    `Les versions Mac et Linux ne sont pas proposées dans la première release.\n` +
    `Sur un petit écran, faites défiler les réglages à gauche pour accéder à toute la palette.\n` +
    `Guide : https://github.com/louiswallet1993-crypto/Pxsize/blob/v${version}/docs/INSTALLATION.md\n` +
    `Aide : https://github.com/louiswallet1993-crypto/Pxsize/issues\n\n` +
    `Source code = code pour le développement, pas un installateur.\n` +
    `SHA256SUMS.txt et BUILD-INFO.json servent aux vérifications techniques ; vous pouvez les ignorer pour installer.\n`;
  fs.writeFileSync(path.join(output, 'LISEZ-MOI.txt'), notice);
  fs.writeFileSync(path.join(output, 'BUILD-INFO.json'), JSON.stringify({ version, sha, builds: manifests.map(item => item.manifest) }, null, 2) + '\n');
  files.push('LISEZ-MOI.txt', 'BUILD-INFO.json');
  checksums(output, files);
  console.log(`Release ${version} : ${files.length + 1} fichiers prêts, commit ${sha}.`);
} else {
  assert.equal(process.argv.length, 2, 'Argument inconnu');
  const key = `${process.platform}-${process.arch}`;
  assert.ok(targets[key], `Cible non prise en charge : ${key}`);
  const report = json(path.join(root, 'output', 'smoke', 'report.json'));
  assert.equal(report.passed, true, 'Les tests doivent réussir');
  assert.equal(report.packaged, true, "Tester l'application empaquetée avant de publier");
  assert.equal(report.sha, sha);
  assert.equal(report.version, version);
  assert.equal(`${report.platform}-${report.arch}`, key);
  const assets = targets[key].map(name => {
    const file = path.join(root, 'dist', name);
    assert.ok(fs.statSync(file).size > 1000000, `Livrable vide ou trop petit : ${name}`);
    return fileInfo(file);
  });
  const output = path.join(root, 'release', 'staged');
  emptyDir(output);
  for (const { name } of assets) fs.copyFileSync(path.join(root, 'dist', name), path.join(output, name), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(output, `manifest-${key}.json`), JSON.stringify({ version, sha, platform: process.platform, arch: process.arch,
    testsPassed: true, layoutFits: report.layoutFits, viewport: report.viewport, layouts: report.layouts,
    checks: report.checks, completedAt: report.completedAt, assets }, null, 2) + '\n');
  console.log(`${key} : ${assets.length} livrable(s) vérifié(s).`);
}
