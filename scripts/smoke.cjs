'use strict';

// Test de la véritable application Electron. Les fichiers de l'utilisateur ne sont pas utilisés.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { _electron } = require('playwright-core');
const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output', 'smoke');
const packaged = process.argv.includes('--packaged');
const report = { passed: false, packaged, version: pkg.version, platform: process.platform, arch: process.arch, checks: [] };
fs.mkdirSync(output, { recursive: true });

function executable() {
  if (!packaged) return require('electron');
  const candidates = {
    win32: ['dist/win-unpacked/PXSize.exe'],
    darwin: [`dist/mac${process.arch === 'arm64' ? '-arm64' : ''}/PXSize.app/Contents/MacOS/PXSize`],
    linux: ['dist/linux-unpacked/pxsize']
  }[process.platform] || [];
  const file = candidates.map(file => path.join(root, file)).find(file => fs.existsSync(file));
  assert.ok(file, 'Application empaquetée absente : construire sur cette machine avant le test');
  return file;
}

async function waitForFile(file) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Export absent après 60 secondes : ${path.basename(file)}`);
}

(async () => {
  let app;
  const errors = [];
  try {
    try { report.sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { report.sha = 'uncommitted'; }
    const runDir = fs.mkdtempSync(path.join(output, 'run-'));
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({
      executablePath: executable(),
      args: [...(packaged ? [] : [root]), `--user-data-dir=${path.join(runDir, 'profile')}`],
      cwd: root,
      env,
      timeout: 60000
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.waitForFunction(() => window.PX?.exporter && document.querySelector('#export-btn'));
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), 'PXSize');
    assert.equal(await page.locator('#export-btn').isDisabled(), true);

    const runtime = await app.evaluate(({ app }) => ({
      version: app.getVersion(), packaged: app.isPackaged, appPath: app.getAppPath(), arch: process.arch
    }));
    runtime.ffmpegPath = path.join(packaged ? `${runtime.appPath}.unpacked` : runtime.appPath,
      'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    assert.equal(runtime.version, pkg.version);
    assert.equal(runtime.packaged, packaged);
    assert.equal(runtime.arch, process.arch);
    for (const suffix of ['', '.LICENSE', '.README']) assert.ok(fs.statSync(runtime.ffmpegPath + suffix).size > 0);
    report.ffmpeg = execFileSync(runtime.ffmpegPath, ['-version'], { encoding: 'utf8', windowsHide: true }).split('\n')[0];
    report.checks.push('startup', 'bundled-ffmpeg-and-notices');
    await page.screenshot({ path: path.join(output, '01-startup.png') });

    const imagePath = path.join(runDir, 'input.png');
    const videoPath = path.join(runDir, 'input.mp4');
    execFileSync(runtime.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30', '-frames:v', '1', imagePath], { windowsHide: true });
    execFileSync(runtime.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '0.4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', videoPath], { windowsHide: true });

    async function load(file, type) {
      const chooser = page.waitForEvent('filechooser');
      await page.locator('#preview-area').click();
      await (await chooser).setFiles(file);
      await page.waitForFunction(expected => PX.state.hasContent && PX.state.sourceType === expected, type);
      await page.waitForFunction(() => document.querySelector('#preview-canvas').width > 0);
    }
    async function saveTo(file) {
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      }, file);
      await page.locator('#export-btn').click();
      await waitForFile(file);
      await page.locator('#progress-overlay').waitFor({ state: 'hidden', timeout: 60000 });
    }
    async function clear() {
      await page.locator('#trash-btn').click();
      await page.locator('#confirm-yes').click();
      await page.waitForFunction(() => !PX.state.hasContent);
    }

    await load(imagePath, 'image');
    const algorithms = ['halftone', 'bitmap', 'floyd', 'bayer2', 'bayer4', 'bayer8', 'digits', 'lines'];
    for (const mode of ['bw', 'color']) {
      await page.locator(`#btn-${mode}`).click();
      for (const algorithm of algorithms) {
        await page.locator('#algo-select').selectOption(algorithm);
        const result = await page.evaluate(async () => {
          const pixels = await PX.render.renderAt(320, 240);
          return { width: pixels.width, height: pixels.height, length: pixels.data.length,
            varied: pixels.data.some((value, index) => index % 4 < 3 && value !== pixels.data[index % 4]) };
        });
        assert.deepEqual(result, { width: 320, height: 240, length: 320 * 240 * 4, varied: true });
      }
    }
    report.checks.push('8-effects-in-bw-and-color');
    await page.locator('#algo-select').selectOption('halftone');
    await page.locator('#theme-dark').click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('fx-theme-shift'));
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    report.viewport = await page.evaluate(() => {
      const palette = document.querySelector('#pal-add').getBoundingClientRect();
      const button = document.querySelector('#export-btn').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, paletteBottom: palette.bottom,
        exportTop: button.top, fits: palette.bottom < button.top && button.bottom <= innerHeight };
    });
    report.layoutFits = report.viewport.fits;
    if (!report.layoutFits) console.warn('Interface à valider : la palette déborde ou chevauche le bouton EXPORT dans cette fenêtre.');
    await page.screenshot({ path: path.join(output, '02-image.png') });
    const png = path.join(runDir, 'export.png');
    await saveTo(png);
    const imageBytes = fs.readFileSync(png);
    assert.equal(imageBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(imageBytes.readUInt32BE(16), 320);
    assert.equal(imageBytes.readUInt32BE(20), 240);
    report.checks.push('png-export-original-dimensions', 'dark-theme');

    await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true }); });
    await page.locator('#export-btn').click();
    await page.locator('#progress-overlay').waitFor({ state: 'hidden' });
    report.checks.push('cancel-save');
    await clear();
    assert.equal(await page.locator('#export-btn').isDisabled(), true);
    await page.evaluate(() => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['test'], 'unsupported.txt', { type: 'text/plain' }));
      window.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    });
    assert.equal(await page.locator('.drop-text').textContent(), 'Unsupported file type');
    report.checks.push('clear-content', 'reject-unsupported-file');

    await load(videoPath, 'video');
    await page.locator('#theme-bright').click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('fx-theme-shift'));
    const mp4 = path.join(runDir, 'export.mp4');
    await saveTo(mp4);
    const bytes = fs.readFileSync(mp4);
    assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
    // Décodage complet : un fichier non vide seul ne prouve pas que l'export est lisible.
    execFileSync(runtime.ffmpegPath, ['-hide_banner', '-v', 'error', '-i', mp4, '-f', 'null', '-'], { windowsHide: true });
    await page.screenshot({ path: path.join(output, '03-video.png') });
    report.checks.push('h264-video-import', 'mp4-export-and-decode');
    assert.deepEqual(errors, [], 'Erreurs dans le renderer');
    report.passed = true;
    console.log(`OK ${process.platform}/${process.arch} — ${report.checks.join(', ')}`);
  } catch (error) {
    report.error = error.message;
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close().catch(() => {});
    report.completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
})();
