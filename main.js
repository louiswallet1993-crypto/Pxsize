'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let ffmpeg = null;
try {
  ffmpeg = require('fluent-ffmpeg');
  let ffmpegPath = require('ffmpeg-static');
  // En app packagée, le binaire est sorti de l'asar dans app.asar.unpacked
  if (app.isPackaged) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (e) {
  console.warn('FFmpeg not available:', e.message);
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 1024,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    title: 'PXSize',
    show: false
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Dialog de sauvegarde ────────────────────────────────────────────
ipcMain.handle('save-file', async (event, { defaultName, filters }) => {
  return dialog.showSaveDialog(win, { defaultPath: defaultName, filters });
});

// ── Écriture disque ─────────────────────────────────────────────────
ipcMain.handle('write-file', async (event, { filePath, buffer }) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Ouverture d'URL externe ─────────────────────────────────────────
ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});

// ── Encodage séquence JPEG → MP4 H.264 ──────────────────────────────
ipcMain.handle('encode-frames-to-mp4', (event, { framesDir, outputPath, fps, totalFrames }) => {
  return new Promise((resolve) => {
    if (!ffmpeg) {
      resolve({ success: false, error: 'FFmpeg not available' });
      return;
    }

    const inputPattern = path.join(framesDir, 'frame_%06d.jpg').replace(/\\/g, '/');
    const outPath = outputPath.replace(/\\/g, '/');

    const cleanup = () => {
      try { fs.rmSync(framesDir, { recursive: true }); } catch (_) {}
    };

    ffmpeg(inputPattern)
      .inputFPS(fps)
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-crf 18', '-preset fast', '-movflags +faststart'])
      .fps(fps)
      .output(outPath)
      .on('progress', info => {
        const pct = totalFrames > 0 ? Math.round(((info.frames || 0) / totalFrames) * 100) : 0;
        event.sender.send('encode-progress', pct);
      })
      .on('end', () => { cleanup(); resolve({ success: true }); })
      .on('error', (err, stdout, stderr) => {
        console.error('[FFmpeg error]', err.message, stderr);
        cleanup();
        resolve({ success: false, error: err.message });
      })
      .run();
  });
});
